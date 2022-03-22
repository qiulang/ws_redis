#! /usr/bin/env node --no-deprecation

const crypto = require('crypto')
const axios = require('axios')
var randomstring = require('randomstring')
const debug = require('debug')
const log = debug("wechat:web")
const _ = require('lodash')
let websocket = require('./socket')


const server = 'https://docker1.emicloud.com/'
let token = 'unknow'

const userid = '1000988323' //7820
const seid = '134'
const ccgeid = '243'
const switchNumber = '02566687671'
const password = 'welcome123'
const is_ccgeid = 1

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
    log(`Failed to ${url} using ${JSON.stringify(body)}`)
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
    // url: 'wechat/BSClient/seatLogin',
    url: '/BSClient/seatLogin',
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
  log(result)
  let uid = result['data']['id']
  uid = `${seid}_${ccgeid}_${uid}`
  log(
      `${number}'s uid is ${uid} has seatLogin, websocket next`
  )
  websocket(server, { user_id:uid, seid, ccgeid, token, uniqueId:'nodejs' })
  setTimeout(()=>{
    console.log(`seatCheckin in 2 seconds to get CR message from ws`)
    seatCheckin(number)
  },2000)
}

async function seatCheckin(number) {
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
    url: 'wechat/seat/Checkin',
    body: data,
  })
  if (result == false) {
    log('Failed to seatCheckin')
    return
  }
  log(result)
  log(`${number} seatCheckin succeed!!`)
}

getToken(7820)
