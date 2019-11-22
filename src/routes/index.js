var express = require('express')
const uuidv1 = require('uuid/v1')
var debug = require('debug')('routers:app')
var router = express.Router()
var { redis, pub } = require('../database/redis')

/* 测试 publish 有没有问题. */
router.post('/dpub', async function(req, res) {
  //for debug only
  let uid = req.body.uid
  let sid = req.body.sid
  if (!sid) {
    var socketid = await redis.hget(`websocket:${uid}`, 'socketid')
  } else {
    socketid = sid
  }
  if (!socketid) {
    debug(`Channel ${uid} related socketid does NOT exist.`)
    res.send(`Channel ${uid} related socketid NOT exist.\n`)
    return
  }
  let msg = {
    op_code: 'debug publish',
    uid: uid,
    data: { msg: 'can you get this' }
  }
  let receiver = await pub.publish(uid, JSON.stringify(msg))
  if (receiver == 0) {
    debug(`Channel ${uid} did NOT get my message.`)
    res.send(`Channel ${uid} did NOT get my message.\n`)
  } else {
    debug(`Channel ${uid} get my message. Check your response at browser.\n`)
    //https://stackoverflow.com/questions/29497038/why-does-a-curl-request-return-a-percent-sign-with-every-request-in-zsh
    res.send(`Channel ${uid} get my message. Check your response browser.\n`)
  }
})

module.exports = router
