var express = require('express')
var app = express()
var cors = require('cors')
var http = require('http').Server(app)
var io = require('socket.io')(http)
// var io = require('socket.io')(http, { path: 'rep' })
var { redis, pub, sub } = require('./database/redis')
var indexRouter = require('./routes/index')
var port = process.env.PORT || 3000

//开发调试已经完成，只用一个debug，并写到 stdout
//https://www.npmjs.com/package/debug#output-streams
var debug = require('debug')('app:websocket')
debug.log = console.log.bind(console)

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cors())
// 试验让 nginx来给
if (process.env.NGINX) {
  debug('use nginx to provide static file, e.g. index.html')
} else {
  debug('use express to provide static file, e.g. index.html')
  app.use(express.static('public'))
}

//重启服务器时候情况 socket.io 到user的映射表，因为客户端会重来上来
redis.del('websocket:socket_user')

io.on('connection', async function(socket) {
  //客户端连接成功后会主动发login消息，redis记录 user 到 socketio.id的对应
  socket.on('login', async function(user_id, fn) {
    debug(`user ${user_id} has login using socket ${socket.id}`)
    if (!user_id) {
      //happen in dev env
      debug('no user id just return')
      fn(`wrong user_id:${user_id}`)
      return
    }
    redis.hset(`websocket:${user_id}`, 'socketid', socket.id)
    redis.hset('websocket:socket_user', socket.id, user_id)
    debug(`store in hash table user_socket ${user_id} => ${socket.id}`)
    fn(`${user_id}`)
    debug(`send ack to user ${user_id}`)
    await sub.subscribe(user_id)
    debug(`subscribe to ${user_id} channel`)
  })
  //用户关闭页面，断网都会触发disconnect消息
  socket.on('disconnect', async function(reason) {
    debug(`socket id ${socket.id} has disconnect with reason ${reason}`)
    let user_id = await redis.hget('websocket:socket_user', socket.id)
    redis.hdel('websocket:socket_user', socket.id)
    debug(`${socket.id} has disconnect, delete its websocket:socket_user data.`)
    let socket_id = await redis.hget(`websocket:${user_id}`, 'socketid')
    if (socket_id == socket.id) {
      redis.hdel(`websocket:${user_id}`, 'socketid')
      debug(`delete ${socket.id} related data ${user_id}`)
      return
    }
    if (socket_id) {
      debug(`${user_id}'s socket has update from ${socket.id} to ${socket_id}`)
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

  //下面是需要浏览器确认的调用方法
  // let socket = io.sockets.connected[socketid]
  // socket.emit('incoming_msg', message, reply => {
  //   debug(`what reply we got ${reply} `)
  // })
})

http.listen(port, function() {
  debug('server starts, listening on *:' + port)
})

app.use('/', indexRouter)
