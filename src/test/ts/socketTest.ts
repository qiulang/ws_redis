require('dotenv-flow').config()
import {socketStart} from "./socketConnect"
var log = require('debug')('test:Main')
var Redis = require('ioredis')
let setting = {port:'6379',host:'localhost',password:''}
if (process.env.TOKEN_CHECK != '0') {
  log(`should connect to remote redis ${process.env.REDIS_HOST}`)
  setting = {
    port: process.env.REDIS_PORT || '6379',
    host: process.env.REDIS_HOST || 'localhost',
    password:process.env.REDIS_PASS || ''
  }
}
var sub = new Redis(setting)
var redis = new Redis(setting)
var pub = new Redis(setting)

const [client,client2,client3] = ['nodejs','client.bs','client.wechat']


async function start() {
  log(`sub to test-result channel and start the test`)
  await sub.subscribe(`test-result`)
  socketStart(client,redis,pub)
}

// No need to catch redis connection error, just ws connection error
// Just one client is enough
sub.on('error', (err:Error) => {
  log('Failed to connect local redis')
  process.exit(1)
})

sub.on("message", function (channel:string, message:string){
  let tmp = message.split('@')
  if (tmp[0] == client) {
    log(`Finished ${message}, now ${client2}`)
    socketStart(client2,redis,pub)
  }
  if (tmp[0] == client2) {
    log(`Finished ${message}, now ${client3}, it will also test ${client3} kicking ${client2}`)
    socketStart(client3,redis,pub)
  }
  if (tmp[0] == client3) {
    log(`Finished ${message} and all tests, close redis event loop so the process can exit`)
    if (tmp[1].endsWith('true')) {
      log('logoff test succeed')
      sub.disconnect()
      pub.disconnect()
      redis.disconnect()
    } else {
      process.exit(1)
    }
  }
})

start()
