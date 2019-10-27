"use strict";

var Redis = require("ioredis");
var debug = require("debug");
var error = debug("app:error");
var log = debug("app:log");

/* 
  https://github.com/luin/ioredis#connect-to-redis
  When a new Redis instance is created, 
  a connection to Redis will be created at the same time.
*/
var redis = new Redis();

// ioredis supports all Redis commands:
redis.set("foo", "bar");
redis.get("foo", function(err, result) {
  if (err) {
    error(err);
  } else {
    log(result);
  }
});
log("del foo")
redis.del("foo");

// Or using a promise if the last argument isn't a function
redis.get("foo").then(function(result) {
  log(result);
});

// Arguments to commands are flattened, so the following are the same:
redis.sadd("set", 1, 3, 5, 7);
redis.sadd("set", [1, 3, 5, 7]);

// All arguments are passed directly to the redis server:
redis.set("key", 100, "EX", 10);

// Change the server configuration
redis.config("set", "notify-keyspace-events", "KEA");

setTimeout(() => {
  log('close the connection after 250ms')
  redis.disconnect()
}, 250);
