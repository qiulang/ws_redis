#! /usr/bin/env node --no-deprecation

// 这是 testable.io 提供模板，本地执行不能这样引入
// const socket = socketio('https://hjguang.emicmh.com/5b0663f07a75d800207ea6c4', {
//   transports: ['websocket']
// })
const crypto = require('crypto')
// const socketClient = require('socket.io-client')
const axios = require('axios')
// var log = require('testable-utils').log
// const cliProgress = require('cli-progress')
var randomstring = require('randomstring')
//使用tee时候颜色自动去掉，所以可以放心使用chalk
const chalk = require('chalk')
const yargs = require('yargs')
const _ = require('lodash')

let websocketTest = require('./socket')

const server1 = 'https://docker1.emicloud.com/'
const server2 = 'http://localhost:3000'
let token = 'unknow'

let userid = '1000988323' //7820
// let userid = '1000988324' //7821
const seid = '134'
const ccgeid = '243'
const numberBase = 1000
const switchNumber = '02566687671'
// const switchNumber = '243'
const password = 'welcome123'
const is_ccgeid = 1

let buff = Buffer.from(password)
let base64data = buff.toString('base64')

let argv = yargs
  .option('w', {
    default: 10,
    describe: 'wait 20*n seconds to end websocket connection',
    type: 'number',
  })
  .option('r', {
    default: 1,
    describe: 'repeat time(s)',
    type: 'number',
  })
  .option('s', {
    default: 0,
    describe: 'test docker1 or localhost',
    type: 'number',
  })
  .option('c', {
    default: 2,
    describe: 'how many concurrent requests to send',
    type: 'number',
  })
  .option('p', {
    default: 0.5,
    describe: 'pause n seconds to run the next login',
    type: 'number',
  }).argv

var wait = argv.w
var repeat = argv.r
var showP = repeat == 1
var pause = argv.p
var server = argv.s == 0 ? server1 : server2
const step = argv.c

const sleep = (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

const axiosReq = axios.create({
  baseURL: 'https://emicall-cmb.emicloud.com/',
  headers: { source: 'client.bs' },
})

function sha256(secret) {
  return crypto.createHash('sha256').update(secret).digest('hex')
}

function timestampINS() {
  return Math.ceil(new Date().getTime() / 1000)
}

async function request({ url, body, headers = {}, method = 'post' }) {
  // console.log(chalk.cyan(`${method} ${url} ...`))
  if (_.isEmpty(headers)) {
    headers = { token }
  }
  let param = {
    url: url,
    method: method,
    headers: headers,
  }
  if (method == 'post') {
    param.data = body
  } else {
    param.params = body
  }
  try {
    const result = await axiosReq(param)
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
    await websocketTest(server, { uid: userid, seid, ccgeid }, { showProgress: showP, wait })
    log.debug(`test ${uid} , now wait ${pause} second`)
    await sleep(pause * 1000)
  }
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

  let signature = sha256(str).toString().toUpperCase()

  console.log(chalk.cyan(`signature :${signature} is about to login`))

  const headers = {
    'auth-type': 'signature',
    signature,
    seat,
    nonce,
    timestamp,
    domain,
    source,
  }
  console.log(chalk.cyan(`user :${number} is about to login`))
  const result = await request({
    url: '/user/bsToken',
    body: { login_type: loginType },
    headers,
  })
  if (result.code != 200) {
    console.log(chalk.cyan(`Got token failed`))
    return
  }
  token = result.data.token
  console.log(chalk.cyan(`Got token:${token}`))
  seatLogin(number)
  // getSetting()
}

async function getSetting() {
  let url = `enterprise/setting/${seid}/${ccgeid}`
  let body = { key: 'extension_start,extension_end' }
  console.log(chalk.cyan(`call ${url}`))
  let result = await request({
    url,
    body,
    method: 'get',
  })
  console.log(chalk.cyan(`Got setting:${JSON.stringify(result)}`))
}

async function seatLogin(number) {
  const result = await request({
    url: '/BSClient/seatLogin',
    body: {
      switch_number: switchNumber,
      work_number: number,
      password: base64data,
    },
  })
  if (result == false) {
    console.log(chalk.red('Failed to seatLogin'))
    return
  }
  userid = result['data']['id']
  let uid = `${seid}_${ccgeid}_${userid}`
  console.log(
    chalk.cyan(
      `${chalk.yellow(number)}'s uid is ${chalk.yellow(uid)} has login, websocket test next`
    )
  )
  // uid = `${seid}_${ccgeid}_${userid}`
  let socket = websocketTest(server, { user_id:uid, seid, ccgeid, token, uniqueId:'nodejs' }, { showProgress: showP, wait })
  setTimeout(()=>{
    console.log(`seatCheckin in 2 seconds to get CR message from ws`)
    seatCheckin(number)
  },2000)
  setTimeout(()=>{
    console.log(`20 seconds later checkout`)
    seatCheckout(number)
    socket.close()
  },20000)
}

async function seatCheckin(number) {
  let tmp = `26${number}`
  data = {
    call_group_id: '1000003218',
    call_group_name: 'bs测试技能组',
    callintype: 4,
    device_number: '13910134045',
    preStatusId: 2,
    number:tmp,
    seid,
    ccgeid,
  }
  const result = await request({
    url: '/BSClient/seatCheckin',
    body: data,
  })
  if (result == false) {
    console.log(chalk.red('Failed to seatCheckin'))
    return
  }
  console.log(result)
  console.log(chalk.cyan(`${number} seatCheckin succeed!!`))
}

async function seatCheckout(number) {
  data = {
    seid,
    ccgeid,
    uid:userid
  }
  const result = await request({
    url: '/BSClient/seatCheckout',
    body: data,
  })
  console.log(`seatCheckout result`)
  console.log(result)
}

// runWebsocketLoop()
// runLoop()
getToken(7820)
