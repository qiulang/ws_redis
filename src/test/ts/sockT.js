const http = require('http');
const sockjs = require('sockjs');
let log = require('debug')('test:sockjs-server')

const echo = sockjs.createServer();
echo.on('connection', function(conn) {
  log(`a connection`)
  conn.on('data', function(message) {
    log(`on data ${message}`)
    conn.write(message);
  });
  conn.on('close', function() {
    log(`on close`)
  });
});

const server = http.createServer();
//https://github.com/sockjs/sockjs-node/issues/304
echo.installHandlers(server);
server.listen(8080, '0.0.0.0');
