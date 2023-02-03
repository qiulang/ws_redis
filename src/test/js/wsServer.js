const WebSocket = require('ws')
const JSONfn = require('json-fn')

const wss = new WebSocket.Server({ port: 3002 })

wss.on('connection', function connection(ws) {
  console.log(`A ws from ${ws} connect`)
  ws.on('message', (evt) => {
    console.log(`on message:received: ${evt}`)
    // console.log(`on message:received: ${evt.data}`)
    // console.log(`on message:received: ${evt.data}`)
    // let msg = JSONfn.parse(evt)
    // msg.res('how to send it client')
    ws.send('test callback')
  })
  ws.on('lastEventId',evt => {
    console.log(`lastEventId: what say you ${evt}`)
  })

  // ws.send('test callback')
})
