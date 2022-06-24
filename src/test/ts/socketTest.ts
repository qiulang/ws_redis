require('dotenv-flow').config()
import {socketStart} from "./socketConnect"
var log = require('debug')('test:Main')
var Redis = require('ioredis')
let setting = {
  port: process.env.REDIS_PORT || '6379',
  host: process.env.REDIS_HOST || 'localhost',
  password:process.env.REDIS_PASS || ''
}
if (process.env.TOKEN_CHECK != '0') {
  log(`should connect to remote redis ${process.env.REDIS_HOST}`)
}
var sub = new Redis(setting)
var redis = new Redis(setting)
var pub = new Redis(setting)

const [client,client2,client3] = ['nodejs','client.bs','client.wechat']
let mobileCheck = 0

async function start() {
  log(`sub to test-result channel and start the test,${JSON.stringify(setting)}`)
  await sub.subscribe(`test-result`)
  socketStart(client,redis,pub)
  //如果发现wechat已经设置为移动座席就直接调用
  // socketStart(client3,redis,pub)
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
    log(`Finished ${message}`)
    if (tmp[1].endsWith('1')) {
      log('logoff test succeed and kicked off client.bs')
    } 
    if (tmp[1].endsWith('0')) {
      log(`failed to kick off client.bs`)
    }
    if (tmp[1].endsWith('2')) {
      log('微信小程序场景，ws服务器提示小程序再次迁入或是移动座席设置')
      stop()
    }
    if (process.env.TOKEN_CHECK != '0' && !tmp[1].endsWith('2')) {
      mobileCheck +=1
      if (mobileCheck ==1) {
        log(`Now check for wechat mobile setting, but we need to wait for 1 minute for ws server to check us out`)
        setTimeout(()=>{
          socketStart(client3,redis,pub)
        },60*1000)
      } else {
        stop()
      }
    } else {
      stop()
    }
  }
})

function stop() {
  log(`close redis event loop so the process can exit`)
  sub.disconnect()
  pub.disconnect()
  redis.disconnect()
  log(`client.bs ws may still connect, so process.exit here`)
  process.exit(0)
}

start()
