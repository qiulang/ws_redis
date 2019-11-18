var express = require('express')
var app = express()
var cors = require('cors')
var http = require('http').Server(app)
var io = require('socket.io')(http)
// var io = require('socket.io')(http, { path: 'rep' })
var { redis, pub, sub } = require('./database/redis')
var indexRouter = require('./routes/index')
var port = process.env.PORT || 3000

//开发调试已经完成，只用一个debug，并写到 stdout, 这样pm2 log才能正常看到
//https://www.npmjs.com/package/debug#output-streams
var debug = require('debug')('app:websocket')
debug.log = console.log.bind(console)

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cors())

//调试用
if (process.env.NGINX) {
  debug('use nginx to provide static file, e.g. index.html')
} else {
  debug('use express to provide static file, e.g. index.html')
  app.use(express.static('public'))
}

http.listen(port, function() {
  debug('server starts, listening on *:' + port)
})

app.use('/', indexRouter)

io.on('connection', async function(socket) {
  //客户端连接成功后会主动发login消息，redis记录 user 到 socketio.id的对应
  socket.on('login', async function(user_id, seid, ccgeid, fn) {
    debug(
      `user ${user_id}, seid:${seid}, ccgeid:${ccgeid} has login using socket ${socket.id}`
    )
    let dup = await dupCheck(user_id, socket.id, fn)
    if (dup) return

    await redis
      .multi()
      .hset('websocket:socket_user', socket.id, user_id) //socket.io 状态变化取到对用用户
      .hset(`websocket:${user_id}`, 'socketid', socket.id) //pub-sub 取到对应的 socket.io
      .hset(`websocket:${user_id}`, 'seid', seid)
      .hset(`websocket:${user_id}`, 'ccgeid', ccgeid)
      .exec()
    debug(`store in hash table user_socket ${user_id} => ${socket.id}`)
    fn(`${user_id}`)
    debug(`send ack to user ${user_id} : ${socket.id}`)
  })
  //Server do NOT have reconnect event
  socket.on('user-reconnect', async function(reason) {
    debug(`Client emit a reconnect event ${socket.id}`)
  })

  //用户关闭页面，断网都会触发disconnect消息
  socket.on('disconnect', async function(reason) {
    debug(`socket id ${socket.id} has disconnect with reason ${reason}`)
    let user_id = await redis.hget('websocket:socket_user', socket.id)
    if (!user_id) {
      debug(`No ${socket.id} related data, should b/c we tell him to logoff.`)
      return
    }
    debug('wait for 2 seconds to call notifyDisconnect')
    //处理重刷浏览器，不要马上就通知web服务器用户下线了
    setTimeout(
      async (sid, uid) => {
        debug(`2 second later, check for ${sid}`)
        let new_socket = await redis.hget(`websocket:${user_id}`, 'socketid')
        if (new_socket == sid) {
          debug('socketio.id remains the same so assume we do disconnect')
          await notifyDisconnect(sid, uid)
        } else {
          debug(`Indeed client reconnect with ${new_socket}`)
        }
      },
      2000,
      socket.id,
      user_id
    )
  })

  //chat-message这个现在意义不大，可以用于测试连接
  socket.on('chat-message', async msg => {
    debug(`用收到消息模拟CS发给我的用户属性:${msg}`)
    let user_id = await redis.hget('websocket:socket_user', socket.id)
    redis.hset(`websocket:${user_id}`, 'chat-message', msg)
  })
})

//订购 redis 消息处理，一般是web服务器发给我们的
sub.on('message', async function(channel, message) {
  debug('Receive message %s from channel %s', message, channel)
  let exist = await redis.exists(`websocket:${channel}`)
  debug(`Does ${channel} exist ? ${exist}`)
  if (exist == 0) return
  //{"op_code":"change_status","ccgeid":243,"seid":134,"uid":1000056188,
  //"data":{"number":"1056","status":1}}
  try {
    let pushData = JSON.parse(message)
    debug(
      `message type: ${pushData.op_code}, data content:${JSON.stringify(
        pushData.data
      )}`
    )
    debug(
      `校验ccgeid: ${pushData.ccgeid}, seid:${pushData.seid}, uid:${pushData.uid}`
    )
    let socketid = await redis.hget(`websocket:${channel}`, 'socketid')
    io.to(socketid).emit('cr_msg', message)
  } catch (err) {
    debug(`${message} is not a valid JSON string so we did not sent to client`)
  }
})
//连接的时候调用检查
async function dupCheck(user_id, socket_id, fn) {
  if (!user_id) {
    //happen in dev env a lot
    debug('no user id so just return')
    fn(`wrong user_id:${user_id}`)
    return true //to let the caller just return
  }
  let exist = await redis.exists(socket_id)
  if (exist > 0) {
    //https://github.com/socketio/socket.io/issues/474
    debug(
      'ws client sometime triggers multi connect events, maybe it is their bug'
    )
    return true
  }
  //自己测试超过1也有过, If node has action queue it will be much easier
  await redis.set(socket_id, 'exists', 'ex', 1)
  debug(`${socket_id} will expire in 1 second. Not sure if this helps.`)
  exist = await redis.exists(`websocket:${user_id}`)
  if (exist == 0) {
    debug(`First time login, subscribe to ${user_id} channel`)
    await sub.subscribe(user_id)
    //no empty hash in redis, so we can't just set a "mark" here to prevent multi-connect event
    //https://stackoverflow.com/questions/21283042/keep-empty-data-keys-in-redis
    //So maybe set an expire key
    return false
  }
  let old_socket = await redis.hget(`websocket:${user_id}`, 'socketid')
  if (old_socket == socket_id) {
    debug('Same socket.io login, but happened after 1 second')
    return true
  }
  //now we assume it is another login
  debug(
    `${user_id} exists with socket id ${old_socket}, assume it is another login(including reconnect).`
  )
  //客户端收到后会close这个socket.io，所以我们还会再收到一条它的disconnect消息
  //TODO 如果加入重刷浏览器的延迟处理会走到这，但是因为旧的连接已经没了我想调用emit也没啥
  io.to(old_socket).emit('logoff', 'another login')
  await redis.hdel('websocket:socket_user', old_socket)
  return false //更新 socketid
}

async function notifyDisconnect(socket_id, user_id) {
  let seid = await redis.hget(`websocket:${user_id}`, 'seid')
  let ccgeid = await redis.hget(`websocket:${user_id}`, 'ccgeid')
  //'{"seid": 134,"ccgeid": 243,"op_code":"check_out","channel_id":"134_243_1000962325"}'
  let msg = {
    seid: seid,
    ccgeid: ccgeid,
    op_code: 'check_out',
    channel_id: user_id
  }
  pub.publish('seat_message_channel', JSON.stringify(msg))
  await redis
    .multi()
    .hdel('websocket:socket_user', socket_id)
    .del(`websocket:${user_id}`)
    .exec()
  debug(`delete ${socket_id} related data ${user_id}`)
}
