var Redis = require('ioredis')
var redis = new Redis()
var pub = new Redis()
var debug = require('debug')
var pubDebug = debug('app:pub')
var subDebug = debug('app:sub')

redis.on('connect', async reason => {
  pubDebug(`get a connect ${reason}`)
  pubDebug('call scanh in connect event')
  await scanh('event')
  pubDebug('bye then')
})

redis.on('message', function(channel, message) {
  // Receive message Hello world! from channel news
  // Receive message Hello again! from channel music
  subDebug('Receive message %s from channel %s', message, channel)
  if (channel == 'request') {
    if (message == 'exit') {
      setTimeout(() => {
        subDebug('close the connection after 2500ms')
        redis.disconnect()
        pub.disconnect()
      }, 250)
    }
  }
})

// There's also an event called 'messageBuffer', which is the same as 'message' except
// it returns buffers instead of strings.
redis.on('messageBuffer', function(channel, message) {
  // Both `channel` and `message` are buffers.
})

async function promiseVer() {
  subDebug('subscribe news & music')
  redis.subscribe('news', 'music', function(err, count) {
    // Now we are subscribed to both the 'news' and 'music' channels.
    // `count` represents the number of channels we are currently subscribed to.
    subDebug(`subscribe ${count} channels`)
    // pubDebug('publish news')
    // num = pub.publish('news', 'Hello world!')
    // //   pubDebug(`what is the return value ${num}`)
    // pubDebug('publish music')
    // pub.publish('music', 'Hello again!')
  })
  //重复订购测试
  let count = await redis.subscribe('status', 'music', 'request')
  subDebug(`in promise verion subscribe ${count} channels`)
  pubDebug('publish to request')
  pubDebug('publish to request exit message to make process exit')
  num = pub.publish('request', 'update my status')
  // setTimeout(() => {
  //   subDebug('close the connection after 2500ms')
  //   redis.disconnect()
  //   pub.disconnect()
  // }, 2500)
}

//promiseVer()

async function scanh(context) {
  pubDebug(`wait keys ${context}`)
  let tables = await pub.keys('websocket:*')
  //for of vs for in 老是忘了
  //https://alligator.io/js/for-of-for-in-loops/
  for (let t of tables) pubDebug(`In ${context} get name ${t}`)
}
pubDebug('call scanh in main loop')
scanh('main')
