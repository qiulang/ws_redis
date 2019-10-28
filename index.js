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
  //   debug('a user connected')
  //   socket.emit('news', { hello: 'world' })
  socket.on('chat message', function(msg) {
    io.emit('chat message', msg)
  })
  socket.on('disconnect', function() {
    io.emit('user disconnected')
  })
})

http.listen(port, function() {
  debug('server starts, listening on *:' + port)
})
