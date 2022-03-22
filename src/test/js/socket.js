const socketClient = require('socket.io-client')
const cliProgress = require('cli-progress')
const chalk = require('chalk')
// var log = require('testable-utils').log
const log = require('pino')()

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

function websocketTest(server, { user_id, seid, ccgeid,token, uniqueId }, { showProgress, wait }) {
  var socket = socketClient(server, { forceNew: true, transports: ['websocket'] })

  function connectHandler(wait = 10, showProgress = false) {
    console.log(
      `${chalk.yellow(socket.id)} aka ${chalk.yellow(user_id)} connected, send login request next`
    )
    socket.emit('login', { user_id, seid, ccgeid,token, uniqueId }, function (data) {
      console.log(data)
      if (data.user_id != 'login') {
        log.fatal('websocket server went wrong, login reply is incorrect')
        socket.close()
        return
      } else {
        console.log('Wait for CR seat status update message')
      }
      // log.info(`Tell server ${socket.id} aka ${uid} says hi`)
      // socket.emit('chat-message', `Hi from ${user_id}`)
      // log.info(`${socket.id} waits for ${wait} seconds to send another message`)
      // if (showProgress) progress(wait)
      // setTimeout(function () {
      //   if (socket.connected) {
      //     socket.emit('chat-message', 'load test')
      //     log.info(`${socket.id} waits for another ${wait * 5} seconds to goodbye`)
      //     if (showProgress) progress(wait * 5)
      //     setTimeout(function () {
      //       bar.stop()
      //       if (socket.connected) {
      //         log.info(`${socket.id} is about to close`)
      //         socket.close()
      //       } else {
      //         log.info(`${user_id} is not connected, just return`)
      //       }
      //     }, wait * 5000 + 1000)
      //   } else {
      //     log.info(`${user_id} is not connected, just return`)
      //   }
      // }, wait * 1000 + 1000)
    })
  }

  socket.on('connect', function () {
    connectHandler(wait, showProgress)
  })

  socket.on('cr_msg', function (data) {
    console.log(`Got CR message ${JSON.stringify(data)}`)
  })

  socket.on('logoff', (data) => {
    log.debug(`We were told to logoff ${socket.id}`)
    socket.close()
  })

  socket.on('disconnect', function () {
    log.debug(`disconnected ${chalk.yellow(user_id)}`)
  })
  return socket
}

module.exports = websocketTest
