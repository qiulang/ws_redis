var express = require('express')
var app = express()
var cors = require('cors')
var http = require('http').Server(app)
var redisAdapter = require('socket.io-redis')
var io = require('socket.io')(http)
// var io = require('socket.io')(http, { path: 'rep' })
var { info, warn } = require('./logger')
var debug = require('debug')('app:websocket:debug')
var { redis, pub, sub } = require('./database/redis')
io.adapter(redisAdapter({ pubClient: pub, subClient: sub }))
var indexRouter = require('./routes/index')
const uuidv1 = require('uuid/v1')
const portfinder = require('portfinder')

let RTIME = process.env.RTIME || 45

startServer()
//不需要redis来存
var dup = {}

app.use(express.json()) //https://stackoverflow.com/a/47232318/301513
app.use(express.urlencoded({ extended: false }))
app.use(cors())

app.use('/', indexRouter)

io.on('connection', async function(socket) {
  //客户端连接成功后会主动发login消息，redis记录 user 到 socketio.id的对应
  socket.on('login', async function(user_id, seid, ccgeid, fn) {
    debug(`user ${user_id}, seid:${seid}, ccgeid:${ccgeid} login using socket ${socket.id}`)
    let exist = await dupCheck(user_id, socket.id, fn)
    if (exist) {
      return
    }
    await redis
      .multi()
      .hset('websocket:socket_user', socket.id, user_id) //socket.io 状态变化取到对用用户
      .hset(
        `websocket:${user_id}`,
        'socketid',
        socket.id, //pub-sub 取到对应的 socket.io
        'seid',
        seid,
        'ccgeid',
        ccgeid
      )
      .exec()
    delete dup[socket.id]
    await sub.subscribe(user_id)
    info(`store in hash table user_socket ${user_id} => ${socket.id} AND SUB subscribe`)
    fn(`${user_id}`)
  })
  //Server do NOT have reconnect event
  //https://socket.io/docs/emit-cheatsheet/
  socket.on('user-reconnect', async function(reason, fn) {
    debug(`Client emit a reconnect event with reason:${reason}, ${socket.id}`)
    fn(`${socket.id}`)
  })

  //用户关闭页面，断网都会触发disconnect消息
  socket.on('disconnect', async function(reason) {
    //https://socket.io/docs/server-api/#Event-%E2%80%98disconnect%E2%80%99
    debug(`socket id ${socket.id} has disconnected with reason ${reason}`)
    //客户端断开，重连，比如重刷浏览器原因是 'transport close'
    //客户端调用 websocket.close 原因是  'client namespace disconnect'
    let get_del = await redis
      .multi()
      .hget('websocket:socket_user', socket.id)
      .hdel('websocket:socket_user', socket.id)
      .exec()
    let user_id = get_del[0][1] //[err, result]
    if (!user_id) {
      warn(`No ${socket.id} related data when it disconnected, BUG!!!`)
      return
    }
    info(`SUB unsubscribe ${user_id} and del ${socket.id} record.`)
    sub.unsubscribe(user_id)
    //RTIME后查是不是用户主动下线， reason 'client namespace disconnect'
    setTimeout(
      async (sid, uid) => {
        debug(`${RTIME} seconds later, check ${sid} with reason ${reason}`)
        let new_socket = await redis.hget(`websocket:${user_id}`, 'socketid')
        if (new_socket == sid) {
          debug('socketio.id remains the same so assume we disconnected')
          if (reason == 'client namespace disconnect') {
            info(`Assume ${uid} logoff and told CR, so we do NOT send check_out message`)
          } else {
            debug(`Assume ${uid} just closes tab, so we need to tell CR`)
            await notifyDisconnect(sid, uid)
          }
        } else {
          debug(`Indeed client reconnect with ${new_socket}`)
        }
      },
      1000 * RTIME,
      socket.id,
      user_id
    )
  })

  //chat-message这个现在意义不大，可以用于测试连接
  socket.on('chat-message', async msg => {
    debug(`用收到消息模拟CS发给我的用户属性:${msg}`)
    let user_id = await redis.hget('websocket:socket_user', socket.id)
    redis.hset(`websocket:${user_id}`, 'chat-message', msg)
  })
})

//订购 redis 消息处理，一般是web服务器发给我们的
sub.on('message', async function(channel, message) {
  debug('SUB channel %s received message %s', channel, message)
  let socketid = await redis.hget(`websocket:${channel}`, 'socketid')
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
    //https://socket.io/docs/emit-cheatsheet/
    io.to(socketid).emit('cr_msg', message)
    info(`SUB emit ${message} to ${socketid}`)
  } catch (err) {
    info(`SUB message ${message} is not a valid JSON string so we did not sent to client`)
  }
})
//连接的时候调用检查
async function dupCheck(user_id, socket_id, fn) {
  if (!user_id) {
    //happen in dev env a lot
    debug('no user id so just return')
    fn(`wrong user_id:${user_id}`)
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
    debug(`Another login with the existing ${socket_id}, just return.`)
    return true
  }
  //now we assume it is another login
  //客户端收到后会close这个socket.io，所以我们还会再收到一条它的disconnect消息
  //加入重刷浏览器的延迟处理会走到这，但是因为旧的连接已经没了我想调用emit也没啥
  io.to(old_socket).emit('logoff', 'another login')
  //不能在这里直接删除'websocket:socket_user' 老的关联关系，因为之前可能是别的docker处理
  //必须在disconect 里处理 redis.hdel 和 sub.unsubscribe
  info(`${user_id} exists with socket id ${old_socket}, tell it to logoff.`)
  return false //更新 socketid
}

async function notifyDisconnect(socket_id, user_id) {
  let seid = await redis.hget(`websocket:${user_id}`, 'seid')
  let ccgeid = await redis.hget(`websocket:${user_id}`, 'ccgeid')
  //'{"seid": 134,"ccgeid": 243,"op_code":"check_out","channel_id":"134_243_1000962325"}'
  let msg = {
    seid: seid,
    ccgeid: ccgeid,
    op_code: 'check_out',
    channel_id: user_id
  }
  pub.publish('seat_message_channel', JSON.stringify(msg))
  info(`publish to seat_message_channel ${user_id} check_out`)
  await redis
    .multi()
    .hdel('websocket:socket_user', socket_id)
    .del(`websocket:${user_id}`)
    .exec()
  debug(`Delete ${socket_id} related data ${user_id} after ${RTIME} seconds`)
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
  http.listen(port, function() {
    debug('server starts, listening on *:' + port)
  })
}
