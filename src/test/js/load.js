// 这是 testable.io 提供模板，本地执行不能这样引入
// const socket = socketio('https://hjguang.emicmh.com/5b0663f07a75d800207ea6c4', {
//   transports: ['websocket']
// })

var log = require('testable-utils').log

var socket = require('socket.io-client')('http://localhost:3000')
const cliProgress = require('cli-progress')
const argv = require('yargs').argv
const bar = new cliProgress.SingleBar()
var userid = '1000988323'
var seid = '134'
var ccgeid = '243'

var wait = +argv.w || 10

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

function smokeTest(wait = 10) {
  log.info('io connected, send login request')
  socket.emit('login', userid, seid, ccgeid, function(data) {
    if (data != userid) {
      log.fatal('websocket server went wrong, login reply is incorrect')
      socket.close()
      return
    }
    log.info('Tell server we say hi')
    socket.emit('chat-message', `Hi from ${userid}`)
    log.info(`wait for ${wait} seconds to send another message`)
    progress(wait)
    setTimeout(function() {
      socket.emit('user-reconnect', 'load test')
      log.info(`wait for another ${wait * 2} seconds to goodbye`)
      progress(wait * 2)
      setTimeout(function() {
        bar.stop()
        socket.close()
      }, wait * 2000 + 1000)
    }, wait * 1000 + 1000)
  })
}

socket.on('connect', function() {
  smokeTest(wait)
})

socket.on('cr_msg', function(data) {
  log.info(`Got CR message ${JSON.stringify(data)}`)
})

socket.on('logoff', data => {
  log.debug(`We were told to logoff ${data}`)
})

socket.on('disconnect', function() {
  log.info('disconnected')
  socket.close()
})
