import { Server } from 'socket.io'
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
const axios = require('axios').default;

var app = express()
// var http = require('http').Server(app)
const httpServer = createServer(app);
var redisAdapter = require('socket.io-redis')
var io = new Server(httpServer, {
  allowEIO3: true,
})
let unserialize = require('locutus/php/var/unserialize')
var { info, warn, browserLog } = require('./logger')
var debug = require('debug')('app:websocket:debug')
var { redis, pub, sub } = require('./database/redis')
io.adapter(redisAdapter({ pubClient: pub, subClient: sub }))
var indexRouter = require('./routes/index')
const uuidv1 = require('uuid/v1')
const portfinder = require('portfinder')

let RTIME:number = +(process.env.RTIME || 45)

//入口函数
startServer()

// https://stackoverflow.com/questions/37233735/interfaces-vs-types-in-typescript

type Client =  'client.bs' | 'client.wechat'
type mobileCheckT = 'login' | 'mobile' //fail the check also return login

interface baseData {
  user_id:string,
  seid?:string,
  ccgeid?:string,
  uniqueId:string, //fingerprintjs 处理同一账号在不同机器登录问题
}

interface loginData extends baseData{ //v5 needs token not v4
  token:string,
  client?:Client
}

interface socketData extends baseData{
  socket_id:string,
  client:Client
}

type loginCBData = {
  user_id:string,
  ver:string
}

type loginCB = (arg: loginCBData) => void;
interface UserSocket { //key value pair
  [key: string]: string;
}

interface SocketRecord {
  [key: string]: 'exist' | undefined
}
interface Auth {
  token:string,
  uid:string,
  client:string
}

//不在redis，一旦socket.id的信息记录到redis就清楚在dup的记录
//不是100%确认一定必要，而且要避免内存泄漏情况
var dup:SocketRecord = {}
//不在redis只记录本进程处理的，目的是在disconnect里判断要不要unsubscribe
//从收集到的日志看这种情况是存在的，而且目前看不会有内存泄漏情况
var user_socket:UserSocket = {}

//https://socket.io/docs/v4/middlewares/#sending-credentials
io.use(async (socket, next) => {
  async function authCheck({token,uid,client}:Auth) {
    let tcheck = await tokenCheck(uid,token,client)
    if (!tcheck) {
        next(new Error("Invalid token"));
    } else {
      next();
    }
  }
  if (Object.keys(socket.handshake.auth).length === 0) {
    const token = socket.handshake.query['token'] as string
    if (!token) {
      // debug('auth is added in socket.io-client 3+, but the client does not use it')
      next();
    } else {
      // debug(`We add query property to socket.io-client 2.x`)
      const uid = socket.handshake.query['uid'] as string
      const client = socket.handshake.query['client'] as string
      authCheck({token,uid,client})
    }
  } else {
    // debug(`The client uses 4.x auth option`)
    const {token,uid,client} = socket.handshake.auth
    authCheck({token,uid,client})
  }
})

//https://socket.io/docs/v4/server-application-structure/
//connect event is fired by the Socket instance upon connection and reconnection.
io.on('connection', async function (socket) {
  // socket.use(([event, ...args], next) => {
  //   next();
  // });
  //客户端连接成功后会主动发login消息，redis记录 user 到 socketio.id的对应
  socket.on('login', async function ({ user_id, seid, ccgeid, token, uniqueId ='none', client = 'client.bs' }:loginData, fn:loginCB) {
    info(
      `A new login. [user:${user_id}, socket:${socket.id}, token:${token}, fingerprintjs:${uniqueId}, ${seid}_${ccgeid}_${client}]`
    )

    function forceLogoff(notify:string) {
      if (typeof fn === 'function') fn({ user_id: notify, ver: 'xxxxxx' })
      //BS 客户端连上来带了 fn ,这个修改本来就是为了防止别人来连我们的 ws，他们应该就不会带fn
      warn(`Close ws connection to reject client login. [${user_id}:${notify}:${token}]`)
      socket.disconnect(true)
      // setTimeout(() => socket.disconnect(true), 3000)
    }
    if (arguments.length>2) {
      //这是v4版本连我们v5服务器，现网第一次升级到v5时候，必然有大量这样情况，就不打日志了
      //v4 版本不传token值，但是从修改 13734 后，我们要求不传token不让连，所以我们要强制用户下线，并做提示
      fn = arguments[arguments.length-1]
      forceLogoff('upgrade') //BS 客户端要相应修改
      return
    }

    if (!user_id || !token) {
      //Thru logs we keep see this and I have no idea why that can happene
      //user undefined, seid:undefined, ccgeid:undefined  login using socket
      socket.disconnect(true)
      return
    }
    //https://stackoverflow.com/questions/5765398/whats-the-best-way-to-convert-a-number-to-a-string-in-javascript
    user_id = `${user_id}` //测试代码发 number 而不是字符串
    let tcheck = await tokenCheck(user_id, token, client)
    if (!tcheck) {
      forceLogoff('logoff') //bug 13734
      return
    }
    let loginRes = 'login'
    if (client == 'client.wechat') { //判断此时是否变为移动坐席
      loginRes = await mobileSettingCheck(token,user_id)
    }
    let exist = await dupCheck({ user_id, client, socket_id:socket.id,uniqueId },fn)
    if (exist) {
      return
    }
    await loginResult({ user_id, client, socket_id:socket.id,uniqueId })
    //考虑了半天代码用什么做版本号好，必须是打包代码能自动生成的，不能每次都手动修改
    //一开始考虑commit id，但是commit id 没法比较代码的新旧，暂定 time stamp
    if (typeof fn === 'function') fn({ user_id: loginRes, ver: 'xxxxxx' })
  })
  

  //用户关闭页面，断网都会触发disconnect消息
  socket.on('disconnect', async function (reason:string) {
    //https://socket.io/docs/server-api/#Event-%E2%80%98disconnect%E2%80%99
    info(`A ws disconnected. [${socket.id}:${reason}]`)
    if (reason.includes(`server namespace disconnect`)) {
      debug(`We close the ws, so just return.[${socket.id}]`)
      return
    }
    //客户端断开，重连，比如重刷浏览器原因是 'transport close'
    //客户端调用 websocket.close 原因是  'client namespace disconnect'
    let get_del = await redis
      .multi()
      .hget('websocket:socket_user', socket.id)
      .hdel('websocket:socket_user', socket.id)
      .exec()
    let user_id = get_del[0][1] //[err, result]
    user_id = user_id?.split('@')[0]
    if (!user_id) {
      warn(`No ws related user data, is "ping timeout" the reason? [${socket.id}:${reason}]`)
      return
    }
    const local = user_socket[user_id]
    if (local == socket.id) {
      //没有新的订阅（包括同一个账号，多个容器处理情况），所以必须取消
      sub.unsubscribe(user_id)
      delete user_socket[user_id]
      info(`SUB unsubscribe, del local ws record. [${user_id}:${socket.id}]`)
    } else {
      //说明有新的连接，而且是同一个进程处理的，就不能 unsubscribe
      info(`SUB renew subscription. [${user_id}:${local} vs ${socket.id}]`)
    }
    //RTIME后查是不是用户主动下线， reason 'client namespace disconnect'
    setTimeout(
      async (sid, uid) => {
        debug(`${RTIME} seconds later to re-check disconect. [${uid}:${sid}:${reason}]`)
        let new_socket = await redis.hget(`websocket:${uid}`, 'socketid')
        if (new_socket == sid) {
          debug(`WS id remains, assume disconnected so del them.[${uid}:${sid}]`)
          if (reason == 'client namespace disconnect') {
            debug(`Assume that user logs off, to fix 16312 we send check_out. [${uid}:${sid}]`)
          } else {
            debug(`Assume that user closes tab, we need to tell CR. [${uid}:${sid}]`)
          }
          await notifyDisconnect(uid)
        } else {
          debug(`The user indeed reconnects. [${uid}:${new_socket}]`)
        }
      },
      1000 * RTIME,
      socket.id,
      user_id
    )
  })

  //chat-message这个现在意义不大，可以用于测试连接
  socket.on('chat-message', async (msg) => {
    debug(`用收到消息模拟CS发给我的用户属性:${msg}`)
    let user_id = await redis.hget('websocket:socket_user', socket.id)
    user_id = user_id.split('@')[0]
    redis.hset(`websocket:${user_id}`, 'chat-message', msg)
  })

  //log the browser message
  socket.on('browser-log', ({ browser, seid, ccgeid, uid, msg }) => {
    //https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/User-Agent/Firefox
    //All starts with Mozilla/5.0
    browserLog(`${browser} browser log. [${seid}:${ccgeid}:${uid} ---> ${msg}]`)
  })
})

//订购 redis 消息处理，一般是web服务器发给我们的
sub.on('message', async function (channel:string, message:string) {
  debug(`SUB channel received message. [${channel}:${message}]`)
  let socketid:string = await redis.hget(`websocket:${channel}`, 'socketid')
  if (!socketid) {
    warn(`No WS for SUB message. [${channel}:${message}]`)
    return
  }
  //{"op_code":"change_status","ccgeid":243,"seid":134,"uid":1000056188,
  //"data":{"number":"1056","status":1}}
  try {
    let pushData = JSON.parse(message)
    //看来暂时不需要
    // pushData['id'] = uuidv1()
    // let tmp = JSON.stringify(pushData)

    //https://stackoverflow.com/questions/27055989/socket-io-1-0-x-get-socket-by-id
    let socket = io.sockets.sockets.get(socketid)
    //https://socket.io/docs/v4/emit-cheatsheet/
    socket?.emit(
      'cr_msg',
      message,
      msgTimeout( //https://github.com/socketio/socket.io/discussions/3846
        //curry function
        (ack) => {
          info(`SUB emit to ws, get ack. [${message} to ${socketid}, ack:${ack}]`)
        },
        () => {
          warn(`SUB emit NOT get ack in 6 seconds!! [${message} to ${socketid}, connected?:${socket?.connected}]`)
        },
        6000
      )
    )
  } catch (err) {
    warn(`SUB emit failed. [${message} to ${socketid}:${err}]`)
  }
})

async function mobileSettingCheck(token:string,uid:string):Promise<mobileCheckT> {
  debug(`query ${process.env.REST_SERVER}/wechat/seat/seatInfo`)
  if (!process.env.REST_SERVER || process.env.TOKEN_CHECK === '0') {
    return 'login'
  }
  //https://axios-http.com/docs/req_config
  const axiosReq = axios.create({
    baseURL: process.env.REST_SERVER,
    headers: { source: 'client.wechat',token },
    timeout: 30000, // default is `0` (no timeout)，同在一个内部网30秒够了
  })
  try {
    let result = await axiosReq({
      url: '/wechat/seat/seatInfo',
      method:'get'
    })
    result = result.data
    debug(result?.data)
    if (result?.code != 200) {
      debug(`/wechat/seat/seatInfo 相应非200 ${JSON.stringify(result)}，走正常(原有)登录流程`)
      return 'login'
    }
    let mobile_seat = result?.data?.is_mobile_seat
    let status =result?.data?.state?.state_id
    let mobile_verified = result?.data?.mobile_verified
    if (mobile_verified == 'N') {
      debug(`${uid} 手机号未验证，走正常(原有)登录流程`)
      return 'login'      
    }
    if (mobile_seat == 'Y') {
      debug(`${uid} 目前是移动坐席,返回mobile，这样小程序需要再次签入`)
      return 'mobile'
    } else {
      debug(`${uid} 目前不是移动坐席`)
    }
    if (status ==1) {
      debug(`${uid} 目前离线，也返回mobile，这样小程序需要再次签入`)
      return 'mobile'
    } else {
      debug(`${uid} 目前在线状态:${status}:${result?.data?.state?.state_name}`)
      return 'login'
    }
  } catch(err) {
    warn(`request /wechat/seat/seatInfo failed we just return ${JSON.stringify(err)}`)
    return 'login'
  }
}


//token检查做身份认证
async function tokenCheck(user_id:string, token:string, client:string):Promise<boolean> {
  if (process.env.TOKEN_CHECK === '0') {
    if (client == 'client.bs' || client == 'client.wechat') {
      debug(`Local redis, skip token check. [${user_id}:${token}:${client}]`)
      return true
    } else {
      debug(`This should be our test case, so fail token check on purpose:${client}`)
      return false
    }
  }
  let tmp = user_id.split('_')
  if (tmp.length != 3) {
    warn(`user_id should have the format of seid_ccgeid_userid. [${user_id}]`)
    return false
  }
  let uid = tmp[2]
  let tr = await redis.get(`cc-cm:user:tokens:seat:${uid}`)
  debug(`login token vs redis value cc-cm:user:tokens:seat:${uid} for ${client}. [${token}:${tr}]`)
  const t = unserialize(tr)
  return t[client] === token //'client.bs' or 'client.wechat'
}

//连接的时候调用检查
async function dupCheck({ user_id, client, socket_id,uniqueId }:socketData, fn:loginCB):Promise<boolean> {
  //试验感觉这里存内存就好，没必要存reids
  // if (exist[0][1] > 0) {
  if (dup[socket_id]) {
    //https://github.com/socketio/socket.io/issues/474
    //有时会收到多个连接请求但也不每次。不清楚是socket.io的问题还是我们代码的问题
    debug(`We get several connect just return. [${user_id}:${socket_id}]`)
    return true
  } else {
    dup[socket_id] = 'exist'
  }
  //https://github.com/luin/ioredis#pipelining
  //Each response follows the format `[err, result]`.
  // let exist = await redis
  //   .multi()
  //   .hexists('websocket:dupCheck', socket_id)
  //   .hset('websocket:dupCheck', socket_id, 'exists')
  //   .exec()
  let tmp = await redis
    .multi()
    .hget(`websocket:${user_id}`, 'socketid')
    .hget(`websocket:${user_id}`, 'browserFinger')
    .hget(`websocket:${user_id}`, 'client')
    .exec()
  let old_socket = tmp[0][1]
  let finger = tmp[1][1]
  let old_client = tmp[2][1]
  if (!old_socket) {
    debug(`First time login. [${user_id}]`)
    // await sub.subscribe(user_id)
    return false
  }
  if (old_socket == socket_id) {
    //比如用户登录页面输了密码到了下一步选通话模式，但点了返回重新输入用户名
    debug(`Another login with the existing ws just return. [${socket_id}]`)
    delete dup[socket_id]
    return true
  }

  // 2 different socket.io ids, now we assume it is another login

  //新老登录都有浏览器指纹，可以做异地登录的判断
  if (finger != 'none' &&
      uniqueId != 'none' &&
      finger != uniqueId) { //finger 相同，认为同一浏览器重复登录，就不强制迁出
    checkout(user_id,old_client)
  }
  //请求来源不同，可以做异地登陆判断
  if (old_client != client) {
    checkout(user_id,old_client)
  }
  //加入延迟删除`websocket:${user_id}` 也会走到这，但是因为旧的连接已经没了我想调用emit也没啥
  //2021.3 还发现有的 ws 服务器docker容器会被 k8s重启，重启我们不删redis记录了
  //所以也有可能走到这，但是这时候的old_socket不存在，和重刷浏览器一样
  //todo: 目前排查redis无效数据对应socket.io.id 最后都是显示这条

  // let old = io.sockets.sockets.get(old_socket)
  // old?.emit('logoff', 'another login')
  io.to(old_socket).emit('logoff', 'another login') //no ack here
  //客户端收到后会close这个socket.io，所以我们还会再收到一条它的disconnect消息
  //不能在这里直接删除'websocket:socket_user'老的关联关系而没有sub.unsubscribe
  //因为前一个连接可能是别的docker处理，必须在disconect 里一起处理 redis.hdel 和 sub.unsubscribe
  debug(`Another login, tell old ws to logoff. [${user_id}:${old_socket}]`)
  return false //更新 socketid
}

async function loginResult({ user_id, client, socket_id,uniqueId }:socketData):Promise<void> {
  const loginT = new Date().toLocaleString()
  await redis
    .multi()
    .hset('websocket:socket_user', socket_id, `${user_id}@${loginT}`) //socket.io 状态变化取到对用用户
    .hset(
      `websocket:${user_id}`,
      'socketid',
      socket_id, //pub-sub 取到对应的 socket.io
      'browserFinger',
      uniqueId,
      'loginTime',
      loginT,
      'client',
      client
    )
    .exec()
  delete dup[socket_id]
  user_socket[user_id] = socket_id
  await sub.subscribe(user_id)
  info(`Login succeed AND SUB subscribe. [${user_id} => ${socket_id}]`)
}

async function checkout(user_id:string,client?:string):Promise<void> {
  let tmp = user_id.split('_')
  let seid = tmp[0]
  let ccgeid = tmp[1]
  //'{"seid": 134,"ccgeid": 243,"op_code":"check_out","channel_id":"134_243_1000962325"}'
  let msg:any = {
    seid: seid,
    ccgeid: ccgeid,
    op_code: 'check_out',
    channel_id: user_id,
  }
  if (client === undefined) {
    client = await redis.hget(`websocket:${user_id}`, 'client')
  }
  if (client != undefined) {
    msg.client = client
  }
  pub.publish('seat_message_channel', JSON.stringify(msg))
  info(`Publish check_out to seat_message_channel. [${JSON.stringify(msg)}]`)  
}

async function notifyDisconnect(user_id:string):Promise<void> {
  checkout(user_id)
  await redis.del(`websocket:${user_id}`)
  debug(`remove websocket:${user_id} from redis`)
}

async function startServer() {
  var port = process.env.PORT || 3000
  //调试用
  if (process.env.NGINX) {
    debug('use nginx to provide static file; port 3000 is free in docker')
  } else {
    debug('use express to provide static file, e.g. index.html')
    app.use(express.static('public'))
    //nginx规则是location / 用express作为fallback，所以这个路由设置应该没效果了
    app.use('/rep', indexRouter) //本地 nginx 测试，实际部署不需要
    portfinder.basePort = port
    port = await portfinder.getPortPromise()
  }
  httpServer.listen(port, function () {
    info('server starts, listening on *:' + port)
  })
  app.use(express.json()) //https://stackoverflow.com/a/47232318/301513
  app.use(express.urlencoded({ extended: false }))
  app.use(cors())
  app.use('/', indexRouter)
}

// make sure `this` is unusable in this standalone function
function msgTimeout(onSuccess:(this: void,...args:any[]) => void, onTimeout:(this: void) => void, timeout:number) {
  let called = false

  const timer = setTimeout(() => {
    if (called) return
    called = true
    onTimeout()
  }, timeout)

  return (...args:any[]) => {
    if (called) return
    called = true
    clearTimeout(timer)
    onSuccess(args)
  }
}

//https://pm2.io/docs/runtime/best-practices/graceful-shutdown/
//We don't clear redis records so no much point to intercept the SIGINT signal currently
// process.on('SIGINT', function() {
//   debug("Caught interrupt signal");
//   process.exit(0)
// });
