const WebSocket = require('ws')

const wss = new WebSocket.Server({ port: 3002 })

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('on message:received: %s', message)
  })

  ws.send('something')
})
