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
//使用tee时候颜色自动去掉，所以可以放心使用chalk
const chalk = require('chalk')
const yargs = require('yargs')
const _ = require('lodash')

const server1 = 'https://docker1.emicloud.com/'
const server2 = 'http://localhost:3000'
let token = 'unknow'

const userid = '1000988323' //7820
const seid = '134'
const ccgeid = '243'
const numberBase = 1000
const switchNumber = '02566609090'
const password = 'cczx123456'

let buff = new Buffer(password)
let base64data = buff.toString('base64')

let argv = yargs
  .option('w', {
    default: 10,
    describe: 'wait 20*n seconds to end websocket connection',
    type: 'number'
  })
  .option('r', {
    default: 1,
    describe: 'repeat time(s)',
    type: 'number'
  })
  .option('s', {
    default: 0,
    describe: 'test docker1 or localhost',
    type: 'number'
  })
  .option('c', {
    default: 2,
    describe: 'how many concurrent requests to send',
    type: 'number'
  })
  .option('p', {
    default: 0.5,
    describe: 'pause n seconds to run the next login',
    type: 'number'
  }).argv

var wait = argv.w
var repeat = argv.r
var showP = repeat == 1
var pause = argv.p
var server = argv.s == 0 ? server1 : server2
const step = argv.c

const sleep = milliseconds => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

const axiosReq = axios.create({
  baseURL: 'https://emicall-cmb.emicloud.com/',
  headers: { source: 'client.bs' }
})

function sha256(secret) {
  return crypto
    .createHash('sha256')
    .update(secret)
    .digest('hex')
}

function timestampINS() {
  return Math.ceil(new Date().getTime() / 1000)
}

async function request({ url, body, headers = {}, method = 'post' }) {
  // console.log(chalk.cyan(`${method} ${url} ...`))
  if (_.isEmpty(headers)) {
    headers = { token }
  }
  try {
    const result = await axiosReq({
      url: url,
      method: method,
      headers: headers,
      data: body
    })
    if (result.status != 200) {
      console.log(chalk.red(`Failed to ${url}`))
      return false
    } else {
      // console.log(chalk.cyan(`${method} ${url} succeed.`))
      return result.data
    }
  } catch (err) {
    console.log(chalk.red(`Failed to ${url} using ${JSON.stringify(body)}`))
    return false
  }
}

async function runLoop() {
  //no build in range in javascript
  let number = numberBase - 1
  for (let index = 0; index < repeat / step; index++) {
    for (let i = 0; i < step; i++) {
      number = number + 1
      getToken(number)
    }
    if (pause == 0) continue
    log.debug(`wait ${pause} second to test ${number + 1}`)
    await sleep(pause * 1000)
  }
}

async function runWebsocketLoop() {
  for (let index = 0; index < repeat; index++) {
    uid = +userid + index
    websocketTest(userid)
    log.debug(`test ${uid} , now wait ${pause} second`)
    await sleep(pause * 1000)
  }
}

function websocketTest(uid) {
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

  function connectHandler(wait = 10, showProgress = false) {
    log.info(
      `${chalk.yellow(socket.id)} aka ${chalk.yellow(uid)} connected, send login request next`
    )
    socket.emit('login', uid, seid, ccgeid, function(data) {
      if (data != uid) {
        log.fatal('websocket server went wrong, login reply is incorrect')
        socket.close()
        return
      }
      // log.info(`Tell server ${socket.id} aka ${uid} says hi`)
      socket.emit('chat-message', `Hi from ${uid}`)
      // log.info(`${socket.id} waits for ${wait} seconds to send another message`)
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
    connectHandler(wait, showP)
  })

  socket.on('cr_msg', function(data) {
    log.info(`Got CR message ${JSON.stringify(data)}`)
  })

  socket.on('logoff', data => {
    log.debug(`We were told to logoff ${socket.id}`)
    socket.close()
  })

  socket.on('disconnect', function() {
    log.debug(`disconnected ${chalk.yellow(uid)}`)
  })
}

async function getToken(number) {
  let authType = 'signature'
  let source = 'client.bs'
  let loginType = 1
  let nonce = randomstring.generate(32)
  let timestamp = timestampINS()
  let domain = 'docker1.emicloud.com'
  const seat = `${number}@${switchNumber}`

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
  console.log(chalk.cyan(`user :${number} is about to login`))
  const result = await request({
    url: '/user/bsToken',
    body: { login_type: loginType },
    headers
  })
  if (result == false) return
  token = result.data.token
  // console.log(chalk.cyan(`Got token:${token}`))
  seatLogin(number)
}

async function seatLogin(number) {
  const result = await request({
    url: '/BSClient/seatLogin',
    body: {
      switch_number: switchNumber,
      work_number: number,
      password: base64data
    }
  })
  if (result == false) {
    console.log(chalk.red('Failed to seatLogin'))
    return
  }
  let uid = result['data']['id']
  console.log(
    chalk.cyan(
      `${chalk.yellow(number)}'s uid is ${chalk.yellow(uid)} has login, websocket test next`
    )
  )
  websocketTest(uid)
  seatCheckin(number)
}

async function seatCheckin(number) {
  data = {
    call_group_id: '1000003218',
    call_group_name: 'bs测试技能组',
    callintype: 2,
    device_number: '',
    preStatusId: 2,
    number,
    seid,
    ccgeid
  }
  const result = await request({
    url: '/BSClient/seatCheckin',
    body: data
  })
  if (result == false) {
    console.log(chalk.red('Failed to seatCheckin'))
    return
  }
  console.log(chalk.cyan(`${number} seatCheckin succeed!!`))
}

// runWebsocketLoop()
runLoop()
