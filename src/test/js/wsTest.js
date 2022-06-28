const WebSocket = require('ws')
const JSONfn = require('json-fn')

// const ws = new WebSocket('ws://localhost:3000/socket.io/?EIO=3&transport=websocket')
const ws = new WebSocket('ws://localhost:3002')

const userid = '1000988323' //7820
const seid = '134'
const ccgeid = '243'
const uid = '100082'

ws.on('open', function open() {
  // ws.send(['login', seid, userid, ccgeid])
  // ws.send('login')
  // // ws.send([seid, userid, ccgeid])
  // ws.send(uid)
  // ws.send("hi")
  // ws.send(JSON.stringify(['seid', '1025'])) //服务器收到 [134, 242]
  // const array = new Float32Array(5);

  // for (var i = 0; i < array.length; ++i) {
  //   array[i] = i / 2;
  // }

  // ws.send(array);
  // ws.send(JSON.stringify([seid, ccgeid]))
  // ws.send(JSON.stringify([seid, ccgeid, userid]))
  // ws.send(cb.toString())
  // ws.send((ack => { console.log(`This is arrow function ${ack}`)}).toString())
  let msg = {
    data:"hi",
    res: ack => { console.log(`This is arrow function ${ack}`)}
  }
  ws.send(JSONfn.stringify(msg))
})

ws.on('message', function incoming(evn) {
  console.log(`on message ${evn}`)
})

function cb(ack) {
  console.log(`This is normal function ${ack}`)
}
