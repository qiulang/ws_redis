const io = require('socket.io-client')
const server = 'http://localhost:3000'
const [user_id, token] = ['1_2_1000', 'xxxxx']
let socket:typeof io
let client:string,wsBit = false
let wsTimeout:NodeJS.Timeout

function setupWS(c:string) {
  // var socket = io(server, { transports: ['websocket'], autoUnref: true })
  let socket = io(server, { transports: ['websocket'] })
  socket = io(server, { transports: ['websocket'] })
  socket.on('connect', function () {
    wsBit = true
    console.log(`Connected to local ws server with ${socket.id}`)
    socket.emit('login', { user_id, token, client },  (reply:any) => {
    })
  })
  socket.on('logoff', (msg:string) => {
    console.log(`${socket.id}:${c} should be kicked off for: ${msg}`)
    socket.close()
  })
  socket.on('connect_error', (err:Error) => {
    console.log(`connect_error due to ${err.message}`)
  })
  socket.on('disconnect',(msg:string) =>{
    console.log(`${socket.id}: disconnect: ${msg}`)
    wsBit = false
  })
}

function start(c:string) {
  [client,wsBit] = [c,false]
  setupWS(c)
  console.log(`Start to connect to ws server:${server} ... using client:${client}`)
  wsTimeout = setTimeout(() => {
    if (!wsBit) {
      console.log(`Failed to connect local ws server with ${c}`)
    } else {
      console.log(`ws connected with ${c}`)
    }
  }, 1000) //for local server, 2 seconds is more than enough
}

function main() {
  start('nodejs')
  setTimeout(()=> {
    console.log('open another connection in 5 seconds')
    start("browser")
  },5000)
}

main()