var Redis = require('ioredis')
var redis = new Redis()
var pub = new Redis()
var debug = require('debug')
var pubDebug = debug('app:pub')
var subDebug = debug('app:sub')

subDebug('subscribe news & music')
redis.subscribe('news', 'music', function(err, count) {
  // Now we are subscribed to both the 'news' and 'music' channels.
  // `count` represents the number of channels we are currently subscribed to.
  subDebug(`subscribe ${count} channels`)
  pubDebug('publish news')
  num = pub.publish('news', 'Hello world!')
  //   pubDebug(`what is the return value ${num}`)
  pubDebug('publish music')
  pub.publish('music', 'Hello again!')
})

redis.on('message', function(channel, message) {
  // Receive message Hello world! from channel news
  // Receive message Hello again! from channel music
  subDebug('Receive message %s from channel %s', message, channel)
})

// There's also an event called 'messageBuffer', which is the same as 'message' except
// it returns buffers instead of strings.
redis.on('messageBuffer', function(channel, message) {
  // Both `channel` and `message` are buffers.
})
