// import { WebSocketServer } from 'ws';
/* ws的 readme 已经改用import 所以参考
* qiulang@qiulangdeMacBook-Air ts % DEBUG=test:* node wssonly.mjs
* file:///Users/qiulang/Projects/call-center/ws_redis/src/test/ts/wssonly.mjs:1
* import { WebSocketServer } from 'ws';
         ^^^^^^^^^^^^^^^
* SyntaxError: Named export 'WebSocketServer' not found. 
* The requested module 'ws' is a CommonJS module, which may not support all module.exports as named exports.
* CommonJS modules can always be imported via the default export, for example using:

* import pkg from 'ws';
* const { WebSocketServer } = pkg;
*/

// https://devdojo.com/bobbyiliev/quick-introduction-to-websockets-with-nodejs
let WebSocketServer = require('ws').Server
var log = require('debug')('test:ws-server')

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function connection(ws) {
  log(`a ws client connects`)
  ws.on('message', function message(data) {
    log(`received: ${data}`);
  });

  ws.send('something');
});