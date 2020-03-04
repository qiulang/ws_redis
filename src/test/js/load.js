// 这是 testable.io 提供模板，本地执行不能这样引入
// const socket = socketio('https://hjguang.emicmh.com/5b0663f07a75d800207ea6c4', {
//   transports: ['websocket']
// })

var log = require('testable-utils').log
const cliProgress = require('cli-progress')
const argv = require('yargs').argv
const userid = '1000988323'
var seid = '134'
var ccgeid = '243'

var wait = +argv.w || 10
var repeat = +argv.r || 1
var showP = repeat == 1

//no build in range in javascript
for (let index = 0; index < repeat; index++) {
  uid = +userid + index
  loadTest(uid)
}

function loadTest(uid) {
  var socket = require('socket.io-client')('http://localhost:3000', { forceNew: true })
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

  function smokeTest(wait = 10, showProgress = false) {
    log.info('io connected, send login request')
    socket.emit('login', uid, seid, ccgeid, function(data) {
      if (data != uid) {
        log.fatal('websocket server went wrong, login reply is incorrect')
        socket.close()
        return
      }
      log.info(`Tell server ${socket.id} aka ${uid} says hi`)
      socket.emit('chat-message', `Hi from ${uid}`)
      log.info(`wait for ${wait} seconds to send another message`)
      if (showProgress) progress(wait)
      setTimeout(function() {
        socket.emit('user-reconnect', 'load test')
        log.info(`wait for another ${wait * 2} seconds to goodbye`)
        if (showProgress) progress(wait * 2)
        setTimeout(function() {
          bar.stop()
          log.info(`${socket.id} is about to close`)
          socket.close()
        }, wait * 2000 + 1000)
      }, wait * 1000 + 1000)
    })
  }

  socket.on('connect', function() {
    smokeTest(wait, showP)
  })

  socket.on('cr_msg', function(data) {
    log.info(`Got CR message ${JSON.stringify(data)}`)
  })

  socket.on('logoff', data => {
    log.debug(`We were told to logoff ${data}`)
  })

  socket.on('disconnect', function() {
    log.debug(`disconnected`)
  })
}
