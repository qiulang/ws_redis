var express = require('express')
const uuidv1 = require('uuid/v1')
var router = express.Router()

/* GET home page. */
router.get('/login', function(req, res, next) {
  res.json({ user: uuidv1() })
})

module.exports = router
