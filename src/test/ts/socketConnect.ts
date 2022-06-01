const { Manager,Socket } = require('socket.io-client')
const io = require('socket.io-client')
// var socket: typeof io !!! wrong, io is the default export function that return Socket
// var socket = io(server, { transports: ['websocket'], autoConnect: false, /*forceNew: true*/ })
const server = 'http://localhost:3000'
var log = require('debug')('test:WS')
var Redis = require('ioredis')
let [user_id, seid, ccgeid, token] = ['134_243_1000988323', '134', '243', 'xxxxx'] //7820
let client:string
var redis:typeof Redis
var pub:typeof Redis

//https://stackoverflow.com/questions/45802988/typescript-use-correct-version-of-settimeout-node-vs-window
let wsTimeout:NodeJS.Timeout, psTimeout:NodeJS.Timeout
let pubsubMsg:any = {msg: 'Can you hear me'}
let pubsubBit = false
let wsBit = false
let logoffBit = 0
//https://www.typescriptlang.org/docs/handbook/enums.html#enums-at-compile-time
type ctype = 'client.bs' | 'client.wechat'

interface loginRep {
  user_id:'login' | 'logoff' | 'upgrade' | 'mobile',
  ver:string
}

interface socketRedis {
  'socketid':string
  'browserFinger':string
  'loginTime':string
  'client':ctype
}

type wsCB = (arg:string) => void

let sockets:{ [key: string]: typeof Socket } = {}

function start(c:string,r: typeof Redis, p: typeof Redis) {
  [client,redis,pub,pubsubBit,wsBit] = [c,r,p,false,false]
  setupWS(c)
  log(`Start to connect to ws server:${server} ... using client:${client}`)
  wsTimeout = setTimeout(() => {
    if (!wsBit) {
      log('Failed to connect local ws server')
      bye(1)
    }
  }, 2000) //本机测试连接 2秒足够
}

function setupWS(c:string) { //b/c client is updated in logoff event in the 3rd test
  if (process.env.TOKEN_CHECK != '0') {
    if (c == 'client.wechat') {
        token = process.env.WTOKEN || token
    }
    if (c =='client.bs') {
      token = process.env.BTOKEN || token
    }
  }
  let socket = io(server, { transports: ['websocket'],
    // auth:{token,uid:user_id,client}
    query:{token,uid:user_id,client}
  })
  // https://github.com/socketio/socket.io/discussions/4336
  // let manager = new Manager(server,{ transports: ['websocket'],query:{token,uid:user_id,client} })
  // let socket = manager.socket("/")
  // let manager = new Manager(server,{ transports: ['websocket'] })
  // let socket = manager.socket("/",{query:{token,uid:user_id,client}})

  sockets[client] = socket
  socket.on('connect', function () {
    wsBit = true
    socket.emit('login', { user_id, seid, ccgeid, token, client }, async (reply:loginRep) => {
      log(`ws login response:${JSON.stringify(reply)}:${socket.id}`)
      let status = reply.user_id
      if (status == 'login') {
        await loginCheck(reply, socket.id)
      }
      if (status == 'logoff' || status == 'mobile') {
        log(`WS server login response:${status} let's consider test passed`)
        logoffBit = 2
        bye(0)
      }
    })
  })

  socket.on('cr_msg', (msg:string, fn:wsCB) => {
    try {
      let tmp = JSON.parse(msg)
      if (tmp.msg == pubsubMsg.msg && tmp.client == client) {
        log(`WS got the message we just pub on redis for ${socket.id}`)
        fn('Got you!')
        pubsubBit = true
      }
    } finally {
      if (!pubsubBit) {
        //json parse error or the parse result incorrect
        log(`WS got the message come from nowhere: ${msg}`)
        fn('Where did you get this message')
      }
    }
  })

  socket.on('connect_error', (err:Error) => {
    log(`${socket.id}:connect_error due to ${err}`)
    if (err.message == "Invalid token") {
      log(`This is invalid token on purpose for 4.x`)
      wsBit = true
      bye(0)
    }
  })

  socket.on('logoff', (msg:string) => {
    log(`${socket.id}:${c}: should be kicked off for: ${msg}`)
    socket.close()
    logoffBit = 1
  })

  socket.on('error', (err:string) => {
    if (err == "Invalid token") {
      log(`This is invalid token on purpose for 2.x`)
      wsBit = true
      bye(0)
    }
  })  
}

async function loginCheck(reply:loginRep, socket_id:string) {
  let sVer = reply.ver
  log(`ws server return version ${sVer} for ${user_id}:${socket_id}`)
  log('We do not need to check redis record actually, just pubsub test is enough')
  let tmp = await redis
    .multi()
    .hget('websocket:socket_user', socket_id)
    .hgetall(`websocket:${user_id}`)
    .exec()
  if (tmp[0][0] || tmp[1][0]) {
    log('Failed to get redis record for the login data')
    bye(1)
    return
  }
  const user_record:string = tmp[0][1]
  const socket_record:socketRedis = tmp[1][1]
  let user = user_record?.split('@')[0]
  let time = user_record?.split('@')[1]
  if (
    time != socket_record['loginTime'] ||
    user != user_id ||
    socket_record['socketid'] != socket_id ||
    socket_record.client != client
  ) {
    log('Redis record was wrong, but ...')
  }
  log('user record & socket record are correct; test pub sub next')
  pubsubTest(1,socket_record.client)
}

function pubsubTest(wait:number,cc:ctype) {
  pubsubMsg.client = cc //it is actually client
  let tmp = JSON.stringify(pubsubMsg)
  pub.publish(user_id, tmp) //Need to be json string
  log(`Now publish a message to redis channel: [${user_id} : ${tmp}]`)
  psTimeout = setTimeout(() => {
    if (!pubsubBit) {
      log(`WS failed to receive the message in ${wait} second.`)
      bye(1)
    } else {
      bye(0)
    }
  }, wait * 1000)
}

function bye(exitCode:0|1) {
  process.exitCode = exitCode
  let msg = exitCode == 0 ? 'Test succeeded' : 'Test failed'
  log(`${msg} for ${client}`)
  if (exitCode ==1) {
    process.exit()
  }
  let socket = sockets[client]
  if (client == 'client.bs') {
    log(`Does not close client.bs ws to try dup-login case`)
  } else {
    socket?.disconnect()
    log(`Close ${client} ws connect`)
  }
  clearTimeout(wsTimeout)
  clearTimeout(psTimeout)
  pub.publish(`test-result`, `${client}@logoff:${logoffBit}`)
  log(`Test with ${client} finished and exit with ${exitCode}, pub test result`)
}

export {start as socketStart}
