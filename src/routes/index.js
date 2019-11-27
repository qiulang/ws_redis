var express = require('express')
let dbg = require('debug')
const uuidv1 = require('uuid/v1')
var { debug, info, warn } = require('../logger')
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
    uid = await redis.hget(`websocket:socket_user`, sid)
  }
  if (!socketid) {
    info(`Channel ${uid} related socketid does NOT exist.`)
    res.send(`Channel ${uid} related socketid NOT exist.\n`)
    return
  }
  if (!uid) {
    info(`Channel does NOT exist, so I can't publish.`)
    res.send(`Channel  NOT exist, so I can't publish.\n`)
    return
  }
  let msg = {
    op_code: 'debug publish',
    uid: uid,
    data: { msg: `can you get this ${uuidv1()}?` }
  }
  let receiver = await pub.publish(uid, JSON.stringify(msg))
  if (receiver == 0) {
    info(`PUB failed, channel ${uid} did NOT get my message.`)
    res.send(`PUB failed, channel ${uid} did NOT get my message.\n`)
  } else {
    info(`PUB succeeded, channel ${uid} : ${msg.data.msg}.\n`)
    //https://stackoverflow.com/questions/29497038/why-does-a-curl-request-return-a-percent-sign-with-every-request-in-zsh
    res.send(`PUB succeeded, channel ${uid} : ${msg.data.msg}.\n`)
  }
})

router.put('/clog', function(req, res) {
  //only 3 levels: debug,info,warn
  let log_level = { d: 'app:*', i: 'app:info,app:warn', w: 'app:warn' }
  let tmp = req.body.level
  let ns = req.body.ns
  //Note that calling enable() completely overrides previously set DEBUG variable
  if (!tmp && !ns) {
    return enableNS('app:*', res)
  }
  if (ns && !tmp) {
    //保留原有外加设置ns
    if (dbg.enabled(ns)) {
      //好像只有disable才能返回当前所有ns
      namespaces = dbg.disable()
      //有一个小问题就是 app:* 没法处理，不花精力了
      namespaces = namespaces.replace(ns, '')
    } else {
      namespaces = dbg.disable()
      namespaces = `${namespaces},${ns}`
    }
    return enableNS(namespaces, res)
  }
  //使用新的log level 外加设置ns
  namespaces = log_level[tmp] || log_level['d']
  if (!ns) {
    return enableNS(namespaces, res)
  }
  if (dbg.enabled(ns)) {
    namespaces = namespaces.replace(ns, '')
  } else {
    namespaces = `${namespaces},${ns}`
  }
  enableNS(namespaces, res)
})

router.get('/clog', function(req, res) {
  namespaces = dbg.disable()
  dbg.enable(namespaces)
  info(`Currently enable ${namespaces}`)
  res.send(`Currently enable ${namespaces}\n`)
})

function enableNS(namespaces, res) {
  dbg.enable(namespaces)
  info(`enable ${namespaces}`)
  res.send(`Enable ${namespaces}\n`)
}
module.exports = router
