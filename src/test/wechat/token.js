#! /usr/bin/env node --no-deprecation

const crypto = require('crypto')
const axios = require('axios')
var randomstring = require('randomstring')
const debug = require('debug')
const log = debug("wechat:web")
const _ = require('lodash')
let websocket = require('./socket')
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
})


const server = 'https://docker1.emicloud.com/'
let token = 'unknown'

const userid = '1000988323' //7820
let uid = "unknown"
const seid = '134'
const ccgeid = '243'
const switchNumber = '02566687671'
const password = 'welcome123'
const is_ccgeid = 1
let socket

let buff = Buffer.from(password)
let base64data = buff.toString('base64')

const sleep = (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

const axiosReq = axios.create({
  baseURL: 'https://emicall-cmb.emicloud.com/',
  headers: { source: 'client.wechat' },
})

function sha256(secret) {
  return crypto.createHash('sha256').update(secret).digest('hex')
}

function timestampINS() {
  return Math.ceil(new Date().getTime() / 1000)
}

async function request({ url, body, headers = {}, method = 'post' }) {
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
      log(`Failed to ${url}`)
      return false
    } else {
      return result.data
    }
  } catch (err) {
    log(err)
    log(`---- Failed to ${url} using ${JSON.stringify(body)}`)
    return false
  }
}

async function getToken(number) {
  let authType = 'signature'
  let source = 'client.wechat'
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

  log(`signature :${signature} is about to login`)

  const headers = {
    'auth-type': 'signature',
    signature,
    seat,
    nonce,
    timestamp,
    domain,
    source,
  }
  log(`user :${number} is about to login`)
  const result = await request({
    url: 'wechat/user/wechatToken',
    body: { login_type: loginType },
    headers,
  })
  if (result.code != 200) {
    log(`Got token failed`)
    return
  }
  token = result.data.token
  log(`Got token:${token}`)
  seatLogin(number)
}


async function seatLogin(number) {
  const result = await request({
    url: 'wechat/BSClient/seatLogin',
    body: {
      switch_number: switchNumber,
      work_number: number,
      password: base64data,
    },
  })
  if (result == false) {
    log('Failed to seatLogin')
    return
  }
  uid = result['data']['id']
  let user_id = `${seid}_${ccgeid}_${uid}`
  log(`${number}'s uid is ${uid} has seatLogin`)
  readline.question(`First time to use wechat with 13910134045? `, async (bind='n') => {
    // readline.close() 都用完才能close
    //不然 seatCheckin 会回复 {"code":140000022,"info":"回拨话机号码未绑定"}
    if (bind =='y') {
      await bindPhone(number,user_id)
    } else {
      readline.close()
      await seatCheckin(number,user_id)
    }
  })
}

async function bindPhone(number,user_id) {
  let result = await request({
    url: 'wechat/seat/sendSms',
    body: {
      mobile:13910134045
    },
  })
  log(`send sms result:${JSON.stringify(result)}`)
  readline.question(`What's your sms code? `,async (code) => {
    result = await request({
      url: 'wechat/seat/bindPhone',
      body: {
        mobile:13910134045,
        code
      },
    })
    log(`bindPhone result: ${JSON.stringify(result)}`)
    readline.close()
    await seatCheckin(number,user_id)
  })
}

async function seatCheckout() {
  data = {
    seid,
    ccgeid,
    uid
  }
  const result = await request({
    url: 'wechat/BSClient/seatCheckout',
    body: data,
  })
  log(`seatCheckout ${JSON.stringify(data)}: result`)
  log(result)
  socket.close()
}

function setWS(user_id) {
  log(`Connect to websocket server first before call seat/checkIn`)
  socket = websocket(server, { user_id, seid, ccgeid, token, uniqueId:'nodejs' })
  setTimeout(()=>{
    log(`seatCheckout in 40 seconds`)
    seatCheckout()
  },40000)
}

async function seatCheckin(number,user_id) {
  setWS(user_id)
  data = {
    call_group_id: '1000003218',
    call_group_name: 'bs测试技能组',
    callintype: 4,
    device_number: '13910134045',
    preStatusId: 2,
    number,
    seid,
    ccgeid,
  }
  const result = await request({
    url: 'wechat/seat/checkIn',
    body: data,
  })
  log(`wechat/seat/checkIn : ${JSON.stringify(result)}`)
  if (result == false) {
    log('Failed to seatCheckin')
    return
  }
  log(`${number} seatCheckin succeed!!`)
}

getToken(7820)