const socketClient = require('socket.io-client')
const debug = require('debug')
const log = debug("wechat:websocket")

function websocket(server, { user_id, seid, ccgeid,token, uniqueId }) {
  //我们使用的vpn可能会导致连不上ws服务器
  let socket = socketClient(server, { transports: ['websocket'] })

  socket.on('connect', function () {
    log(`${socket.id} aka ${user_id} connected, send login request next`)
    socket.emit('login', { user_id, seid, ccgeid,token, uniqueId,client:"client.wechat" }, function (data) {
      log(data)
      if (data.user_id != 'login') {
        log('websocket server went wrong, login reply is incorrect')
        socket.close()
        return
      } else {
        log('Wait for CR seat status update message')
      }
    })
  })

  socket.on('cr_msg', function (data) {
    log(`Got CR message ${JSON.stringify(data)}`)
  })

  socket.on('logoff', (data) => {
    log(`We were told to logoff ${socket.id}`)
    socket.close()
  })

  socket.on('disconnect', function () {
    log(`disconnected ${user_id}`)
  })
  return socket
}

module.exports = websocket
