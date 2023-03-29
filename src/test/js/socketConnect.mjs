// const io = require('socket.io-client')
// import  {io}  from 'socket.io-client'
// 必须跑在浏览器里,所以单独再写一个 wsBrowser.mjs文件
import { io } from "../basic-websocket-client/src/index.js";
const server = 'http://localhost:3000'
var socket = io(server, { transports: ['websocket'], autoConnect: false })
// var log = require('debug')('client:test')
// var Redis = require('ioredis')
import debugModule from "debug";
let log = debugModule('client:test')
import Redis from 'ioredis'
var redis = new Redis()
var pub = new Redis()

const [user_id, seid, ccgeid, token, client] = ['1_2_1000', '1', '2', 'xxxxx', 'client.bs']
const pubsubMsg = JSON.stringify({ msg: 'Can you hear me' }) //Need to be json string
let pubsubBit = false
let wsBit = false

function start() {
  log(`Start to connect to ws server:${server} ...`)
  socket.open()
  setTimeout(() => {
    if (!wsBit) {
      log('Failed to connect local ws server')
      bye(1)
    }
  }, 2000) //本机测试连接 2秒足够
}

socket.on('connect', function () {
  wsBit = true
  socket.emit('login', { user_id, seid, ccgeid, token, client }, async (reply) => {
    log(reply)
    let status = reply.user_id
    if (status == 'login') {
      await loginCheck(reply, socket.id)
    }
    if (status == 'logoff' || status == 'upgrade') {
      log("why ??")
      bye(0)
    }
  })
})

socket.on('cr_msg', (msg, fn) => {
  if (msg == pubsubMsg) {
    log(`WS got the message we just pub on redis -- "${msg}"`)
    fn('Got you!')
    pubsubBit = true
  } else {
    log(`WS got the message come from nowhere: ${msg}`)
    fn('Where did you get this message')
  }
})

socket.on('connect_error', (err) => {
  log(`connect_error due to ${err.message}`)
})

async function loginCheck(reply, socket_id) {
  let sVer = reply.ver
  log(`ws server return version ${sVer} for ${user_id}`)
  log('We do not need to check redis record actually, just pubsub test is enough')
  let tmp = await redis
    .multi()
    .hget('websocket:socket_user', socket_id)
    .hgetall(`websocket:${user_id}`)
    .exec()
  if (tmp[0][0] || tmp[1][0]) {
    log('Failed to get redis record for the login data')
    bye(1)
    return
  }
  const user_record = tmp[0][1]
  const socket_record = tmp[1][1]
  let user = user_record.split('@')[0]
  let time = user_record.split('@')[1]
  if (
    time != socket_record['loginTime'] ||
    user != user_id ||
    socket_record['socketid'] != socket_id
  ) {
    log('Redis record was wrong')
    bye(1)
    return
  }
  log('user record & socket record are correct; test pub sub next')
  await pubsubTest(0.5)
}

async function pubsubTest(wait) {
  log(`Now publish a message to redis channel: [${user_id} : ${pubsubMsg}]`)
  pub.publish(user_id, pubsubMsg)
  setTimeout(() => {
    if (!pubsubBit) {
      log(`WS failed to receive the message in ${wait} second.`)
      bye(1)
    } else {
      bye(0)
    }
  }, wait * 1000)
}

function bye(exitCode) {
  log(`Close redis and socket.io event loop so the process can exit with ${exitCode}`)
  process.exitCode = exitCode
  let msg = exitCode == 0 ? 'Test succeeded' : 'Test failed'
  log(msg)
  socket.disconnect()
  redis.disconnect()
  pub.disconnect()
}

start()
