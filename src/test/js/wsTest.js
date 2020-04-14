const socketClient = require('socket.io-client')
const cliProgress = require('cli-progress')
const chalk = require('chalk')
var log = require('testable-utils').log

var bar = new cliProgress.SingleBar()

function progress(total) {
  bar.start(total, 0)
  let timer = setInterval(() => {
    bar.increment(1)
  }, 1000)
  setTimeout(() => {
    console.log(' ...')
    clearInterval(timer)
  }, total * 1000 + 500)
}

function websocketTest(server, { uid, seid, ccgeid }, { showProgress, wait }) {
  var socket = socketClient(server, { forceNew: true, transports: ['websocket'] })

  function connectHandler(wait = 10, showProgress = false) {
    log.info(
      `${chalk.yellow(socket.id)} aka ${chalk.yellow(uid)} connected, send login request next`
    )
    socket.emit('login', uid, seid, ccgeid, function (data) {
      if (data != uid) {
        log.fatal('websocket server went wrong, login reply is incorrect')
        socket.close()
        return
      }
      // log.info(`Tell server ${socket.id} aka ${uid} says hi`)
      socket.emit('chat-message', `Hi from ${uid}`)
      log.info(`${socket.id} waits for ${wait} seconds to send another message`)
      if (showProgress) progress(wait)
      setTimeout(function () {
        if (socket.connected) {
          socket.emit('user-reconnect', 'load test')
          log.info(`${socket.id} waits for another ${wait * 20} seconds to goodbye`)
          if (showProgress) progress(wait * 20)
          setTimeout(function () {
            bar.stop()
            if (socket.connected) {
              log.info(`${socket.id} is about to close`)
              socket.close()
            } else {
              log.info(`${uid} is not connected, just return`)
            }
          }, wait * 20000 + 1000)
        } else {
          log.info(`${uid} is not connected, just return`)
        }
      }, wait * 1000 + 1000)
    })
  }

  socket.on('connect', function () {
    connectHandler(wait, showProgress)
  })

  socket.on('cr_msg', function (data) {
    log.info(`Got CR message ${JSON.stringify(data)}`)
  })

  socket.on('logoff', (data) => {
    log.debug(`We were told to logoff ${socket.id}`)
    socket.close()
  })

  socket.on('disconnect', function () {
    log.debug(`disconnected ${chalk.yellow(uid)}`)
  })
}

module.exports = websocketTest
