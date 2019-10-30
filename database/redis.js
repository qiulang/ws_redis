require('dotenv-flow').config()
var Redis = require('ioredis')
var debug = require('debug')('redis')
const setting = {
  port: process.env.REDIS_PORT || 6379,
  host: process.env.REDIS_HOST || 'localhost'
}
var redis = new Redis(setting.port, setting.host)
var sub = new Redis(setting.port, setting.host)
var pub = new Redis(setting.port, setting.host)

module.exports = {
  redis,
  pub,
  sub,
  debugr: debug
}
