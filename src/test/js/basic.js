'use strict'

var Redis = require('ioredis')
var debug = require('debug')
var error = debug('app:error')
var log = debug('app:log')
const uuidv1 = require('uuid/v1')

/* 
  https://github.com/luin/ioredis#connect-to-redis
  When a new Redis instance is created, 
  a connection to Redis will be created at the same time.
*/
var redis = new Redis()

async function getMore(user_id = '555') {
  let tmp = await redis
    .multi()
    .hget(`websocket:${user_id}`, 'seid')
    .hget(`websocket:${user_id}`, 'ccgeid')
    .del(`websocket:${user_id}`)
    .exec()

  let seid = tmp[0][1]
  let ccgeid = tmp[1][1]
  log(`get 555's seid:${seid}, ccgeid:${ccgeid}`)
}

getMore()

// ioredis supports all Redis commands:
async function tranc() {
  log('trancsation test')
  let result = await redis.hset(
    'websocket:debug2',
    'socketid',
    'sid1',
    'seid',
    'seid01',
    'ccgid',
    'ccgeid01'
  )
  log(`what is hset result ${result}`)
  let user_id = await redis.hget('websocket:socket_user1', 'hi you')
  if (!user_id) {
    log('nil result is what I need')
  } else {
    log('disappointed')
  }
  //'exists', 'ex', 1
  let exist = await redis
    // .exists('websocket:debug')
    .multi()
    .exists('websocket:debug')
    .set('websocket:debug', 'exists', 'ex', 1)
    .exec()
  if (exist[0][1] == 0 && exist[1][1] == 'OK') {
    log('0 result is what I need')
  } else {
    log(`disappointed ${exist}`)
  }

  await redis.set('atomic', 'get-delete')
  let atomic = await redis.multi().get('atomic').del('atomic').exec()
  log(`${atomic[0][1]} : ${atomic[1][1]}`)
  if (atomic[0][1] == 'get-delete' && atomic[1][1] == 1) {
    log('atomic get-delete')
  }

  exist = await redis.exists('websocket:debug')

  if (exist == 1) {
    log('1 result is what I need')
  } else {
    log(`disappointed ${exist}`)
  }
  redis.disconnect()
}

tranc()

redis.set('foo', 'bar')
redis.get('foo', function (err, result) {
  if (err) {
    error(err)
  } else {
    log(result)
  }
})
log('del foo')
redis.del('foo')
log(uuidv1())

// Or using a promise if the last argument isn't a function
redis.get('foo').then(function (result) {
  log(result)
})

// Arguments to commands are flattened, so the following are the same:
redis.sadd('myset', 1, 3, 5, 7)
redis.sadd('myset', [1, 3, 5, 7])

// All arguments are passed directly to the redis server:
redis.set('key', 100, 'EX', 10)

// Change the server configuration
redis.config('set', 'notify-keyspace-events', 'KEA')

async function promiseVer() {
  redis.set('foo', 'bar')
  let result = await redis.get('foo')
  log(`promise version ${result}`)
  result = await redis.smembers('myset')
  log(`myset member ${result}`)
  redis.del('user')
  redis.lpush('user', 'qiu', 'lang', 'tong', 'jia')
  result = await redis.lindex('user', 0)
  log(`list index 1 ${result}`)
  result = await redis.lrange('user', 0, -1)
  log(`list with all range ${result}`)
  //   redis.hset("home", "tmp", 28);
  //   redis.hmset("home", "space", 100, "name", "myhome");
  redis.del('home')
  redis.hset('home', 'space', 100, 'name', 'myhome', 'temp', 15)
  result = await redis.hget('home', 'temp')
  log(`hash for field  temp: ${result}`)
  result = await redis.hget('home', 'nonexist')
  log(`hash for field  nonexist:${result}`)
  setTimeout(() => {
    log('close the connection after 250ms')
    redis.disconnect()
  }, 250)
}

// promiseVer()
