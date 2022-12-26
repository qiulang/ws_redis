//import WebSocket from 'ws';
// 服务器要先起，不然连不上直接就报错退出
let WebSocket = require('ws')
let io = require('socket.io-client')
let log = require('debug')('test:ws-client')
const server = 'ws://localhost:8080'
const ws = new WebSocket(server);

ws.on('open', function open() {
  log(`connet to ws://localhost:8080`)
  ws.send('something');
});

ws.on('message', function message(data) {
  log('received: %s', data);
});

//https://socket.io/docs/v4/memory-usage/
//为了证实 socket.io-client 没法直接和ws服务器相连
let socket = io(server, { transports: ['websocket'] })
socket.on('connect', function () {
    log(`socket.io client connects to ws server`)
})

socket.on('connect_error', (err) => {
    log(`${socket.id}:connect_error due to ${err}`)
})

socket.on('error',(err) => {
    log(`${socket.id}: error due to ${err}`)
})
socket.on('disconnect', function () {
    log(`disconnected ${socket.id}`)
})