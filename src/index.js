var express = require('express')
var app = express()
var cors = require('cors')
var http = require('http').Server(app)
var io = require('socket.io')(http)
// var io = require('socket.io')(http, { path: 'rep' })
var { redis, pub, sub } = require('./database/redis')
var indexRouter = require('./routes/index')
var port = process.env.PORT || 3000
let RTIME = process.env.RTIME || 10

//开发调试已经完成，只用一个debug，并写到 stdout, 这样pm2 log才能正常看到
//https://www.npmjs.com/package/debug#output-streams
var debug = require('debug')('app:websocket')
debug.log = console.log.bind(console)

//不需要redis来存
var dup = {}

app.use(express.json()) //https://stackoverflow.com/a/47232318/301513
app.use(express.urlencoded({ extended: false }))
app.use(cors())

//调试用
if (process.env.NGINX) {
  debug('use nginx to provide static file, e.g. index.html')
} else {
  debug('use express to provide static file, e.g. index.html')
  app.use(express.static('public'))
}

http.listen(port, function() {
  debug('server starts, listening on *:' + port)
})

app.use('/', indexRouter)
app.use('/rep', indexRouter) //from nginx

io.on('connection', async function(socket) {
  //客户端连接成功后会主动发login消息，redis记录 user 到 socketio.id的对应
  socket.on('login', async function(user_id, seid, ccgeid, fn) {
    debug(
      `user ${user_id}, seid:${seid}, ccgeid:${ccgeid} login using socket ${socket.id}`
    )
    let exist = await dupCheck(user_id, socket.id, fn)
    if (exist) {
      //dupCheck 里设置了
      delete dup[socket.id]
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
    debug(`store in hash table user_socket ${user_id} => ${socket.id}`)
    fn(`${user_id}`)
  })
  //Server do NOT have reconnect event
  socket.on('user-reconnect', async function(reason) {
    debug(`Client emit a reconnect event ${socket.id}`)
  })

  //用户关闭页面，断网都会触发disconnect消息
  socket.on('disconnect', async function(reason) {
    debug(`socket id ${socket.id} has disconnect with reason ${reason}`)
    let user_id = await redis.hget('websocket:socket_user', socket.id)
    if (!user_id) {
      debug(`No ${socket.id} related data, should b/c we tell him to logoff.`)
      return
    }
    if (reason == 'transport close') {
      debug('Lost connection, just return')
      return
    }
    //处理重刷浏览器，不要马上就通知web服务器用户下线了
    setTimeout(
      async (sid, uid) => {
        debug(`${RTIME} seconds later, check for ${sid}`)
        let new_socket = await redis.hget(`websocket:${user_id}`, 'socketid')
        if (new_socket == sid) {
          debug('socketio.id remains the same so assume we do disconnect')
          await notifyDisconnect(sid, uid)
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
  debug('Receive message %s from channel %s', message, channel)
  let socketid = await redis.hget(`websocket:${channel}`, 'socketid')
  if (!socketid) {
    debug(`Channel ${channel} does NOT exist.`)
    return
  }
  //{"op_code":"change_status","ccgeid":243,"seid":134,"uid":1000056188,
  //"data":{"number":"1056","status":1}}
  try {
    let pushData = JSON.parse(message)
    io.to(socketid).emit('cr_msg', message)
    debug(`emit the message to ${socketid}`)
  } catch (err) {
    debug(`${message} is not a valid JSON string so we did not sent to client`)
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
    debug(`We get several connect events:${user_id}--${socket_id}, return.`)
    return true
  } else {
    dup[socket_id] = 'exist'
  }
  let old_socket = await redis.hget(`websocket:${user_id}`, 'socketid')
  if (!old_socket) {
    debug(`First time login, subscribe to ${user_id} channel`)
    await sub.subscribe(user_id)
    return false
  }
  if (old_socket == socket_id) {
    debug(`Another login with the same existing ${socket_id}, return.`)
    return true
  }
  //now we assume it is another login
  //客户端收到后会close这个socket.io，所以我们还会再收到一条它的disconnect消息
  //加入重刷浏览器的延迟处理会走到这，但是因为旧的连接已经没了我想调用emit也没啥
  io.to(old_socket).emit('logoff', 'another login')
  await redis.hdel('websocket:socket_user', old_socket)
  debug(`${user_id} exists with socket id ${old_socket}, tell it to logoff.`)
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
  await redis
    .multi()
    .hdel('websocket:socket_user', socket_id)
    .del(`websocket:${user_id}`)
    .exec()
  debug(
    `delete ${socket_id} related data ${user_id} after disconnect for ${RTIME} seconds`
  )
}
