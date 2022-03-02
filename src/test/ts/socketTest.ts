import {socketStart,log} from "./socketConnect"
var Redis = require('ioredis')
var sub = new Redis()
var redis = new Redis()
var pub = new Redis()

const [client,client2,client3] = ['nodejs','client.bs','client.wechat']


async function start() {
  await sub.subscribe(`test-result`)
  socketStart(client,redis,pub)
}

// No need to catch redis connection error, just ws connection error
redis.on('error', (err:Error) => {
  log('Failed to connect local redis')
})

pub.on('error', (err:Error) => {
  log('Failed to connect local redis')
})

sub.on("message", function (channel:string, message:string){
  if (message == client) {
    log(`Finished ${message} now ${client2}`)
    socketStart(client2,redis,pub)
  }
  if (message == client2) {
    log(`Finished ${message} now ${client3}, it will also test ${client3} kicking ${client2}`)
    socketStart(client3,redis,pub)
  }
  if (message == client3) {
    log(`Finished all tests, close redis event loop so the process can exit`)
    sub.disconnect()
    pub.disconnect()
    redis.disconnect()
  }
})

start()
