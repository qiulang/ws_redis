const WebSocket = require('ws')

const ws = new WebSocket('ws://localhost:3000/socket.io/?EIO=3&transport=websocket')
//const ws = new WebSocket('ws://localhost:3002')

const userid = '1000988323' //7820
const seid = '134'
const ccgeid = '243'
const uid = '100082'

ws.on('open', function open() {
  // ws.send(['login', seid, userid, ccgeid])
  ws.send('login')
  // ws.send([seid, userid, ccgeid])
  ws.send(uid)
  ws.send([seid, uid])
  ws.send([seid, ccgeid])
  ws.send([seid, ccgeid, userid])
})

ws.on('message', function incoming(data) {
  console.log(`on message ${data}`)
})
