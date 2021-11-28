require('dotenv-flow').config()
var Redis = require('ioredis')
var { info, warn } = require('../logger')
var debug = require('debug')('app:redis:debug')
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

//https://stackoverflow.com/questions/12710905/how-do-i-dynamically-assign-properties-to-an-object-in-typescript
const setting = {
  port: process.env.REDIS_PORT || 6379,
  host: process.env.REDIS_HOST || 'localhost',
  password:''
}

//https://stackoverflow.com/questions/11704267/in-javascript-how-to-conditionally-add-a-member-to-an-object/38483660
//不要炫技了

if (process.env.REDIS_PASS) setting.password = process.env.REDIS_PASS

info(`Connect to redis using ${JSON.stringify(setting)}`)

var redis = new Redis(setting)
var sub = new Redis(setting)
var pub = new Redis(setting)

redis.on('error', (err:any) => {
  if (err.message.includes('invalid password')) {
    //By default debug will log to stderr.
    warn('Invalid password so redis fails to work, so just exit')
    process.exit(1)
  }
  if (err.message.includes('connect ECONNREFUSED')) {
    warn('Failed to connect redis, redis-server is probably down')
  }
  warn('REDIS: FAILED， will keep reconnecting, but what next?')
})

async function cleaup() {
  debug('每次启动都清空redis数据，假定浏览器会重连，我们再重写入新的数据')
  //await will wait for redis connect
  let tables = await redis.keys('websocket:*')
  debug(`${tables.length} websocket connections will be deleted`)
  for (let t of tables) {
    debug(`delete ${t}`)
    redis.del(t)
  }
}

// 没必要清空，参见readme，当时清空没有什么道理
// cleaup()

module.exports = {
  redis,
  pub,
  sub,
}
