var express = require('express')
var app = express()
var cors = require('cors')
var http = require('http').Server(app)
var io = require('socket.io')(http)
// var io = require('socket.io')(http, { path: 'rep' })
var { redis, pub, sub } = require('./database/redis')
var indexRouter = require('./routes/index')
var port = process.env.PORT || 3000

//开发调试已经完成，只用一个debug，并写到 stdout, 这样pm2 log才能正常看到
//https://www.npmjs.com/package/debug#output-streams
var debug = require('debug')('app:websocket')
debug.log = console.log.bind(console)

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cors())

//调试用
if (process.env.NGINX) {
  debug('use nginx to provide static file, e.g. index.html')
} else {
  debug('use express to provide static file, e.g. index.html')
  app.use(express.static('public'))
}

io.on('connection', async function(socket) {
  //客户端连接成功后会主动发login消息，redis记录 user 到 socketio.id的对应
  socket.on('login', async function(user_id, seid, ccgeid, fn) {
    debug(
      `user ${user_id}, seid:${seid}, ccgeid:${ccgeid} has login using socket ${socket.id}`
    )
    let dup = await dupCheck(user_id, socket.id, fn)
    if (dup) return
    await redis.hset('websocket:socket_user', socket.id, user_id)
    //TODO better not store socketid in websocket:${user_id}
    await redis.hset(`websocket:${user_id}`, 'socketid', socket.id)
    redis.hset(`websocket:${user_id}`, 'seid', seid)
    redis.hset(`websocket:${user_id}`, 'ccgeid', ccgeid)
    debug(`store in hash table user_socket ${user_id} => ${socket.id}`)
    fn(`${user_id}`)
    debug(`send ack to user ${user_id}`)
  })
  //Can server get reconnect event ?
  socket.on('reconnect', async function(reason) {
    debug('Can server get reconnect event ?')
  })
  //用户关闭页面，断网都会触发disconnect消息
  socket.on('disconnect', async function(reason) {
    debug(`socket id ${socket.id} has disconnect with reason ${reason}`)
    let user_id = await redis.hget('websocket:socket_user', socket.id)
    if (!user_id) {
      debug(
        `socket id ${socket.id} related user has gone, probably b/c we tell him to logoff.`
      )
      return
    }
    debug(`${socket.id} has disconnect, delete its websocket:socket_user data.`)
    await redis.hdel('websocket:socket_user', socket.id)
    let socket_id = await redis.hget(`websocket:${user_id}`, 'socketid')
    if (socket_id == socket.id) {
      //TODO 先通知web 服务器， 但是因为区分不了是不是用户重刷浏览器，web服务器要能处理！！
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
      redis.del(`websocket:${user_id}`)
      debug(`delete ${socket.id} related data ${user_id}`)
      return
    }
    //TODO 这是有蹊跷的地方，因为确实常看到以下消息，但为什么 websocket:socket_user 和 websocket:${user_id} 记录数据不一致？
    if (socket_id) {
      debug(
        `${user_id}'s socket has update from ${socket.id} to ${socket_id}. Weird!!!`
      )
    } else {
      debug(`${socket.id} related data has been cleared up`)
    }
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
  let exist = await redis.exists(`websocket:${channel}`)
  debug(`Does ${channel} exist ? ${exist}`)
  if (exist == 0) return
  //{"op_code":"change_status","ccgeid":243,"seid":134,"uid":1000056188,
  //"data":{"number":"1056","status":1}}
  try {
    let pushData = JSON.parse(message)
    debug(
      `message type: ${pushData.op_code}, data content:${JSON.stringify(
        pushData.data
      )}`
    )
    debug(
      `校验ccgeid: ${pushData.ccgeid}, seid:${pushData.seid}, uid:${pushData.uid}`
    )
    let socketid = await redis.hget(`websocket:${channel}`, 'socketid')
    io.to(socketid).emit('cr_msg', message)
  } catch (err) {
    debug(`${message} is not a valid JSON string so we did not sent to client`)
  }
})

http.listen(port, function() {
  debug('server starts, listening on *:' + port)
})

app.use('/', indexRouter)

async function dupCheck(user_id, socket_id, fn) {
  if (!user_id) {
    //happen in dev env a lot
    debug('no user id so just return')
    fn(`wrong user_id:${user_id}`)
    return true //to let the caller just return
  }
  let exist = await redis.exists(`websocket:${user_id}`)
  if (exist == 0) {
    debug(`First time login, subscribe to ${user_id} channel`)
    await sub.subscribe(user_id)
    return false
  }
  let old_socket = await redis.hget(`websocket:${user_id}`, 'socketid')
  if (old_socket == socket_id) {
    debug('It happens when user refresh his browser or server restarts')
    return true
  }
  //now we assume it is another login
  debug(
    `${user_id} exists with socket id ${old_socket}, assume user login with another browser?`
  )
  io.to(old_socket).emit('logoff', 'another login')
  //客户端收到后会close这个socket.io，所以我们还会再收到一条它的disconnect消息
  await redis.hdel('websocket:socket_user', old_socket)
  return false //更新 socketid
}
