var express = require('express')
var path = require('path')
var Redis = require('ioredis')
var debug = require('debug')
var debugw = debug('websocket')
var debugr = debug('redis')
var app = express()
var redis = new Redis()
//https://stackoverflow.com/questions/26921117/http-createserverapp-v-http-serverapp
var http = require('http').Server(app)
//https://stackoverflow.com/questions/27492101/what-is-happening-when-requirehttp-server-is-evaluated-with-an-express-app
var io = require('socket.io')(http)
var port = process.env.PORT || 3000

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, 'public')))
//重启服务器时候情况 socket.io 到user的映射表，因为客户端会重来上来
redis.del('socket_user')

io.on('connection', function(socket) {
  //TODO 重刷浏览器 socket.id 会变，服务器端需要有一个方法能唯一标识浏览器端
  socket.on('login', function(user_id) {
    debugw(`user ${user_id} has login using socket ${socket.id}`)
    //需要设在两个hash table里
    redis.hset(user_id, 'socketid', socket.id)
    redis.hset('socket_user', socket.id, user_id)
    debugr(`store in hash table user_socket ${user_id} => ${socket.id}`)
    io.to(socket.id).emit('loginAck', `I see you ${user_id}`)
  })
  //https://stackoverflow.com/questions/16293520/how-to-detect-that-users-connection-is-lost-or-he-closed-the-browser-window-in
  //用户关闭页面，断网都会触发disconnect消息
  socket.on('disconnect', async function(reason) {
    debugw(`socket id ${socket.id} has disconnect with reason ${reason}`)
    debugr(
      `socket id ${socket.id} has disconnect, need to clear up its related data.`
    )
    let user_id = await redis.hget('socket_user', socket.id)
    debugr(`delete ${socket.id} related data ${user_id}`)
    redis.hdel(user_id, 'socketid')
    redis.hdel('socket_user', socket.id)
  })

  socket.on('chat-message', async msg => {
    debugr(`用收到消息模拟CS发给我的用户属性:${msg}`)
    let user_id = await redis.hget('socket_user', socket.id)
    redis.hset(user_id, 'chat-message', msg)
  })
})

http.listen(port, function() {
  debugw('server starts, listening on *:' + port)
})
