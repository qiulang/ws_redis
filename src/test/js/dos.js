const io = require('socket.io-client')
const server = 'https://docker1.emicloud.com/'
var socket = io(server, { transports: ['websocket']})
var log = require('debug')('dos')

socket.on('connect', function () {
    log(`connect to wss and do nothing`)
    // socket.emit("login",{user_id:'1000',seid:'1111'},(data)=>{
    //     log(`After send login ${data}`)
    // })
})


socket.on('disconnect',(msg) =>{
    log(`disconnect with ${msg}`)
})