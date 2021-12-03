import { Server } from "socket.io";
var express = require('express')
var app = express()
var cors = require('cors')
var http = require('http').Server(app)
var redisAdapter = require('socket.io-redis')
var io = new Server(http, {
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

interface baseData {
  user_id:string,
  seid:string,
  ccgeid:string,
}

interface loginData extends baseData{
  token:string,
  client?:string
}

interface socketData extends baseData{
  socket_id:string,
}

type loginCBData = {
  user_id:string,
  ver:string
}

type loginCB = (arg: loginCBData) => void;
interface UserSocket {
  [key: string]: string;
}

interface SocketRecord {
  [key: string]: 'exist' | undefined
}

//不在redis，一旦socket.id的信息记录到redis就清楚在dup的记录
//不是100%确认一定必要，而且要避免内存泄漏情况
var dup:SocketRecord = {}
//不在redis只记录本进程处理的，目的是在disconnect里判断要不要unsubscribe
//从收集到的日志看这种情况是存在的，而且目前看不会有内存泄漏情况
var user_socket:UserSocket = {}

io.on('connection', async function (socket) {
  //客户端连接成功后会主动发login消息，redis记录 user 到 socketio.id的对应
  socket.on('login', async function ({ user_id, seid, ccgeid, token, client = 'client.bs' }:loginData, fn:loginCB) {
    debug(
      `user ${user_id}, seid:${seid}, ccgeid:${ccgeid}, token:${token} ${client} login using socket ${socket.id}`
    )
    if (!user_id || !token) {
      //Thru logs we keep see this and I have no idea why that can happene
      //user undefined, seid:undefined, ccgeid:undefined  login using socket
      socket.disconnect(true)
      return
    }
    let tcheck = await tokenCheck(user_id, token, client)
    if (!tcheck) {
      if (typeof fn === 'function') fn({ user_id: 'logoff', ver: 'xxxxxx' })
      //BS 客户端连上来带了 fn ,这个修改本来就是为了防止别人来连我们的 ws，他们应该就不会带fn
      warn(`${user_id} uses invalid token ${token}, close ws connection `)
      socket.disconnect(true)
      // setTimeout(() => socket.disconnect(true), 3000)
      return
    }
    let exist = await dupCheck(user_id, socket.id, fn)
    if (exist) {
      return
    }
    await login({ user_id, seid, ccgeid, socket_id:socket.id })
    //考虑了半天代码用什么做版本号好，必须是打包代码能自动生成的，不能每次都手动修改
    //一开始考虑commit id，但是commit id 没法比较代码的新旧，暂定 time stamp
    if (typeof fn === 'function') fn({ user_id: 'login', ver: 'xxxxxx' })
  })
  //Server do NOT have reconnect event
  //https://socket.io/docs/emit-cheatsheet/
  socket.on('user-reconnect', async function (reason, fn) {
    debug(`Client emit a reconnect event with reason:${reason}, ${socket.id}`)
    if (fn && typeof fn === 'function') fn(`${socket.id}`)
  })

  //用户关闭页面，断网都会触发disconnect消息
  socket.on('disconnect', async function (reason:string) {
    //https://socket.io/docs/server-api/#Event-%E2%80%98disconnect%E2%80%99
    debug(`socket id ${socket.id} has disconnected with reason ${reason}`)
    if (reason.includes(`server namespace disconnect`)) {
      debug(`We close it, so just return`)
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
    if (!user_id) {
      warn(`No ${socket.id} related data, is "ping timeout" the reason? ${reason}`)
      return
    }
    const local = user_socket[user_id]
    if (local == socket.id) {
      info(`SUB unsubscribe ${user_id} and del ${socket.id} record.`)
      //没有新的订阅（包括同一个账号，多个容器处理情况），所以必须取消
      sub.unsubscribe(user_id)
      delete user_socket[user_id]
    } else {
      //说明有新的连接，而且是同一个进程处理的，就不能 unsubscribe
      info(`SUB ${user_id} has new subscription: ${local} vs ${socket.id}`)
    }
    //RTIME后查是不是用户主动下线， reason 'client namespace disconnect'
    setTimeout(
      async (sid, uid) => {
        debug(`${RTIME} seconds later, check ${sid} with reason ${reason}`)
        let new_socket = await redis.hget(`websocket:${uid}`, 'socketid')
        if (new_socket == sid) {
          debug(`${sid} remains the same so assume we disconnected`)
          debug(`Delete ${sid} related data ${uid} after ${RTIME} seconds`)
          if (reason == 'client namespace disconnect') {
            info(`Assume ${uid} logoff, to fix 16312 we send check_out message`)
          } else {
            debug(`Assume ${uid} just closes tab, so we need to tell CR`)
          }
          await notifyDisconnect(sid, uid)
        } else {
          debug(`${uid} indeed client reconnect with ${new_socket}`)
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
    redis.hset(`websocket:${user_id}`, 'chat-message', msg)
  })

  //log the browser message
  socket.on('browser-log', ({ browser, seid, ccgeid, uid, msg }) => {
    //https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/User-Agent/Firefox
    //All starts with Mozilla/5.0
    browserLog(`${browser} ---> ${seid}:${ccgeid}:${uid} ---> ${msg}`)
  })
})

//订购 redis 消息处理，一般是web服务器发给我们的
sub.on('message', async function (channel:string, message:string) {
  debug('SUB channel %s received message %s', channel, message)
  let socketid:string = await redis.hget(`websocket:${channel}`, 'socketid')
  if (!socketid) {
    warn(`Got ${message} but channel ${channel} does NOT exist.`)
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
          info(`SUB emit ${message} to ${socketid} and get ack ${ack}`)
        },
        () => {
          warn(`SUB emit ${message} to ${socketid} NOT get ack in 6 seconds!!`)
        },
        6000
      )
    )
  } catch (err) {
    info(`io.to ${socketid} emit failed:${JSON.stringify(err)}`)
  }
})

//token检查做身份认证
async function tokenCheck(user_id:string, token:string, client:string) {
  if (process.env.TOKEN_CHECK === '0') {
    debug(`Local redis, skip token check: ${user_id}:${token}`)
    return true
  }
  let tmp = user_id.split('_')
  if (tmp.length != 3) {
    debug('user_id/channel_id should have the format of seid_ccgeid_userid')
    return false
  }
  let uid = tmp[2]
  let tr = await redis.get(`cc-cm:user:tokens:seat:${uid}`)
  debug(`${token} vs redis value cc-cm:user:tokens:seat:${uid} for ${tr}`)
  const t = unserialize(tr)
  return t[client] === token //'client.bs' or 'client.wechat'
}

//连接的时候调用检查
async function dupCheck(user_id:string, socket_id:string, fn:loginCB) {
  if (!user_id) {
    //happen in dev env a lot
    debug('no user id so just return, probably no fn in this case')
    //fn(`wrong user_id:${user_id}`)
    return true //to let the caller just return
  }
  //试验感觉这里存内存就好，没必要存reids
  //https://github.com/luin/ioredis#pipelining
  //Each response follows the format `[err, result]`.
  // let exist = await redis
  //   .multi()
  //   .hexists('websocket:dupCheck', socket_id)
  //   .hset('websocket:dupCheck', socket_id, 'exists')
  //   .exec()
  // if (exist[0][1] > 0) {
  if (dup[socket_id]) {
    //https://github.com/socketio/socket.io/issues/474
    //有时会收到多个连接请求但也不每次。不清楚是socket.io的问题还是我们代码的问题
    debug(`We get several connect: ${user_id}--${socket_id}, just return.`)
    return true
  } else {
    dup[socket_id] = 'exist'
  }
  let old_socket = await redis.hget(`websocket:${user_id}`, 'socketid')
  if (!old_socket) {
    debug(`First time login`)
    // await sub.subscribe(user_id)
    return false
  }
  if (old_socket == socket_id) {
    //比如用户登录页面输了密码到了下一步选通话模式，但点了返回重新输入用户名
    debug(`Another login with the existing ${socket_id}, just return.`)
    delete dup[socket_id]
    return true
  }
  //now we assume it is another login
  //客户端收到后会close这个socket.io，所以我们还会再收到一条它的disconnect消息
  //加入延迟删除`websocket:${user_id}` 也会走到这，但是因为旧的连接已经没了我想调用emit也没啥
  //2021.3 还发现有的 ws 服务器docker容器会被 k8s重启，重启我们不删redis记录了
  //所以也有可能走到这，但是这时候的old_socket不存在，和重刷浏览器一样
  //todo: 目前排查redis无效数据对应socket.io.id 最后都是显示这条
  io.to(old_socket).emit('logoff', 'another login')
  //不能在这里直接删除'websocket:socket_user'，老的关联关系而没有sub.unsubscribe
  //因为前一个连接可能是别的docker处理，必须在disconect 里一起处理 redis.hdel 和 sub.unsubscribe
  info(`${user_id} exists with socket id ${old_socket}, tell it to logoff.`)
  return false //更新 socketid
}

async function login({ user_id, seid, ccgeid, socket_id }:socketData) {
  await redis
    .multi()
    .hset('websocket:socket_user', socket_id, user_id) //socket.io 状态变化取到对用用户
    .hset(
      `websocket:${user_id}`,
      'socketid',
      socket_id, //pub-sub 取到对应的 socket.io
      'seid',
      seid,
      'ccgeid',
      ccgeid
    )
    .exec()
  delete dup[socket_id]
  user_socket[user_id] = socket_id
  await sub.subscribe(user_id)
  info(`store in hash table user_socket ${user_id} => ${socket_id} AND SUB subscribe`)
}

async function notifyDisconnect(socket_id:string, user_id:string) {
  let tmp = await redis
    .multi()
    .hget(`websocket:${user_id}`, 'seid')
    .hget(`websocket:${user_id}`, 'ccgeid')
    .del(`websocket:${user_id}`)
    .exec()

  let seid = tmp[0][1]
  let ccgeid = tmp[1][1]
  //'{"seid": 134,"ccgeid": 243,"op_code":"check_out","channel_id":"134_243_1000962325"}'
  let msg = {
    seid: seid,
    ccgeid: ccgeid,
    op_code: 'check_out',
    channel_id: user_id,
  }
  pub.publish('seat_message_channel', JSON.stringify(msg))
  info(`publish to seat_message_channel ${user_id} check_out`)
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
  http.listen(port, function () {
    debug('server starts, listening on *:' + port)
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
