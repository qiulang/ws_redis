#! /usr/bin/env node --no-deprecation

// 这是 testable.io 提供模板，本地执行不能这样引入
// const socket = socketio('https://hjguang.emicmh.com/5b0663f07a75d800207ea6c4', {
//   transports: ['websocket']
// })
const crypto = require('crypto')
const socketClient = require('socket.io-client')
const axios = require('axios')
var log = require('testable-utils').log
const cliProgress = require('cli-progress')
var randomstring = require('randomstring')
const argv = require('yargs').argv

const server1 = 'https://docker1.emicloud.com/'
const server2 = 'http://localhost:3000'
let token = 'unknow'

const userid = '1000988323'
const seid = '134'
const ccgeid = '243'
const number = '7820'
const switchNumber = '02566687671'

let buff = new Buffer('123456')
let base64data = buff.toString('base64')

const axiosReq = axios.create({
  baseURL: 'https://emicall-cmb.emicloud.com/',
  headers: { source: 'client.bs' }
})

var wait = +argv.w || 10
var repeat = +argv.r || 1
var showP = repeat == 1
var tmp = +argv.s || 0
var server = tmp == 0 ? server2 : server1
var pause = +argv.p || 0.5

const sleep = milliseconds => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function sha256(secret) {
  return crypto
    .createHash('sha256')
    .update(secret)
    .digest('hex')
}

function timestampINS() {
  return Math.ceil(new Date().getTime() / 1000)
}

async function runLoop() {
  //no build in range in javascript
  for (let index = 0; index < repeat; index++) {
    uid = +userid + index
    loadTest(userid)
    log.debug(`test ${uid} , now wait ${pause} second`)
    await sleep(pause * 1000)
  }
}

function loadTest(uid) {
  var socket = socketClient(server, { forceNew: true, transports: ['websocket'] })
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
    log.info(`${socket.id} aka ${uid} connected, send login request next`)
    socket.emit('login', uid, seid, ccgeid, function(data) {
      if (data != uid) {
        log.fatal('websocket server went wrong, login reply is incorrect')
        socket.close()
        return
      }
      log.info(`Tell server ${socket.id} aka ${uid} says hi`)
      socket.emit('chat-message', `Hi from ${uid}`)
      log.info(`${socket.id} waits for ${wait} seconds to send another message`)
      if (showProgress) progress(wait)
      setTimeout(function() {
        if (socket.connected) {
          socket.emit('user-reconnect', 'load test')
          log.info(`${socket.id} waits for another ${wait * 20} seconds to goodbye`)
          if (showProgress) progress(wait * 20)
          setTimeout(function() {
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

  socket.on('connect', function() {
    smokeTest(wait, showP)
  })

  socket.on('cr_msg', function(data) {
    log.info(`Got CR message ${JSON.stringify(data)}`)
  })

  socket.on('logoff', data => {
    log.debug(`We were told to logoff ${socket.id}`)
    socket.close()
  })

  socket.on('disconnect', function() {
    log.debug(`disconnected ${uid}`)
  })
}

async function getToken(number, switchNumber) {
  let authType = 'signature'
  let source = 'client.bs'
  let loginType = 1
  let nonce = randomstring.generate(32)
  let timestamp = timestampINS()
  let domain = 'docker1.emicloud.com'
  const seat = `${number}@${switchNumber}`
  const password = '123456'

  let str =
    `auth-type=${authType}&login_type=${loginType}` +
    `&nonce=${nonce}&seat=${seat}&source=${source}` +
    `&timestamp=${timestamp}&signatureKey=${password}`

  let signature = sha256(str)
    .toString()
    .toUpperCase()

  const headers = {
    'auth-type': 'signature',
    signature,
    seat,
    nonce,
    timestamp,
    domain
  }

  const result = await axiosReq({
    url: '/user/bsToken',
    method: 'POST',
    headers,
    data: {
      login_type: loginType
    }
  })
  if (result.status === 200) {
    token = result.data.data.token
    log.debug(`Got token:${token}`)
  }
}

async function seatLogin() {
  const headers = {
    nonce: randomstring.generate(32),
    timestamp: timestampINS(),
    token
  }
  const loginSuccess = await axiosReq({
    url: '/BSClient/seatLogin',
    method: 'POST',
    headers,
    data: {
      switch_number: switchNumber,
      work_number: number,
      password: base64data
    }
  })
}

// runLoop()
getToken(number, switchNumber)
