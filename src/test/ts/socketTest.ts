import {socketStart} from "./socketConnect"
var log = require('debug')('test:Main')
var Redis = require('ioredis')
var sub = new Redis()
var redis = new Redis()
var pub = new Redis()

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
    sub.disconnect()
    pub.disconnect()
    redis.disconnect()
    if (tmp[1].endsWith('true')) {
      log('logoff test succeed')
    } else {
      process.exit(1)
    }
  }
})

start()
