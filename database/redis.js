require('dotenv-flow').config()
var Redis = require('ioredis')
var debug = require('debug')('app:redis')
/*
new Redis({
  port: 6379, // Redis port
  host: "127.0.0.1", // Redis host
  family: 4, // 4 (IPv4) or 6 (IPv6)
  password: "auth",
  db: 0
});
or 
Connect to 127.0.0.1:6380, db 4, using password "authpassword":
new Redis("redis://:authpassword@127.0.0.1:6380/4");
*/

const setting = {
  port: process.env.REDIS_PORT || 6379,
  host: process.env.REDIS_HOST || 'localhost'
}

//https://stackoverflow.com/questions/11704267/in-javascript-how-to-conditionally-add-a-member-to-an-object/38483660
//不要炫技了

if (process.env.REDIS_PASS) setting.password = process.env.REDIS_PASS

var redis = new Redis(setting)
var sub = new Redis(setting)
var pub = new Redis(setting)

redis.on('error', err => {
  if (err.message.includes('invalid password')) {
    debug('Invalid password so redis fails to work, so just exit')
    process.exit(1)
  }
  if (err.message.includes('connect ECONNREFUSED')) {
    debug('Failed to connect redis, redis-server is probably down')
  }
  debug('REDIS: FAILED， will keep reconnecting, but what next?')
})

module.exports = {
  redis,
  pub,
  sub,
  debugr: debug
}
