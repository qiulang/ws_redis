var express = require('express')
const uuidv1 = require('uuid/v1')
var debug = require('debug')('routers:app')
var router = express.Router()

/* GET home page. */
router.get('/login', function(req, res, next) {
  //for debug only
  debug(req.headers['user-agent'])
  if (req.headers['user-agent'].includes('Firefox')) {
    //Firefox 我自己用写死 1000056188 方便和小冯调试
    res.json({ user: '1000056188' })
  } else {
    res.json({ user: uuidv1() })
  }
})

module.exports = router
