var express = require('express')
var path = require('path')
var debugw = require('debug')('websocket')
var app = express()
var http = require('http').Server(app)
var io = require('socket.io')(http)
var port = process.env.PORT || 3000
var { redis, pub, sub, debugr } = require('./redisDB')

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, 'public')))
//重启服务器时候情况 socket.io 到user的映射表，因为客户端会重来上来
redis.del('websocket:socket_user')

io.on('connection', async function(socket) {
  //客户端连接成功后会主动发login消息，redis记录 user 到 socketio.id的对应
  socket.on('login', async function(user_id) {
    debugw(`user ${user_id} has login using socket ${socket.id}`)
    redis.hset(`websocket:${user_id}`, 'socketid', socket.id)
    redis.hset('websocket:socket_user', socket.id, user_id)
    await sub.subscribe(user_id)
    debugr(`subscribe to ${user_id} channel`)
    debugr(`store in hash table user_socket ${user_id} => ${socket.id}`)
    // io.to(socket.id).emit('loginAck', `I see you ${user_id}`, reply => {
    socket.emit('loginAck', `I see you ${user_id}`)
  })
  //用户关闭页面，断网都会触发disconnect消息
  socket.on('disconnect', async function(reason) {
    debugw(`socket id ${socket.id} has disconnect with reason ${reason}`)
    debugr(
      `socket id ${socket.id} has disconnect, need to clear up its related data.`
    )
    let user_id = await redis.hget('websocket:socket_user', socket.id)
    debugr(`delete ${socket.id} related data ${user_id}`)
    redis.hdel(`websocket:${user_id}`, 'socketid')
    redis.hdel('websocket:socket_user', socket.id)
  })

  socket.on('chat-message', async msg => {
    debugr(`用收到消息模拟CS发给我的用户属性:${msg}`)
    let user_id = await redis.hget('websocket:socket_user', socket.id)
    redis.hset(`websocket:${user_id}`, 'chat-message', msg)
  })
})

//订购 redis 消息处理，一般是web服务器发给我们的
sub.on('message', async function(channel, message) {
  debugr('Receive message %s from channel %s', message, channel)
  let exist = await redis.exists(`websocket:${channel}`)
  debugr(`Does ${channel} exist ? ${exist}`)
  if (exist == 0) return
  let socketid = await redis.hget(`websocket:${channel}`, 'socketid')
  // io.to(socketid).emit('incoming_msg', message)
  let socket = io.sockets.connected[socketid]
  socket.emit('incoming_msg', message, reply => {
    debugw(`what reply we got ${reply} `)
  })
})

http.listen(port, function() {
  debugw('server starts, listening on *:' + port)
})
