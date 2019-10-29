var express = require('express')
var path = require('path')
var debug = require('debug')('websocket')
var app = express()
//https://stackoverflow.com/questions/26921117/http-createserverapp-v-http-serverapp
var http = require('http').Server(app)
//https://stackoverflow.com/questions/27492101/what-is-happening-when-requirehttp-server-is-evaluated-with-an-express-app
var io = require('socket.io')(http)
var port = process.env.PORT || 3000

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, 'public')))

io.on('connection', function(socket) {
  //重刷浏览器 socket.id 会变，服务器端需要有一个方法能唯一标识浏览器端
  io.to(socket.id).emit('welcome', 'hey there')
  socket.on('login', function(id, msg) {
    debug(`what id ${id} and message ${msg} do I got`)
    io.to(id).emit('ack', 'I see you')
  })
  socket.on('disconnect', function() {
    io.emit('user disconnected')
  })
})

http.listen(port, function() {
  debug('server starts, listening on *:' + port)
})
