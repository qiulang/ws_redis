'use strict'

var events = require('events'),
  util = require('util')

var EventEmitter = events.EventEmitter

var foo = new EventEmitter()

var foo = new Foo()

function addListener(name) {
  foo.removeAllListeners('x')
  foo.on('x', function () {
    console.log(`${name}`)
  })
}

function addListener2(name) {
  foo.once('x', function () {
    foo.removeAllListeners('x')
    console.log(`${name}`)
  })
}

// addListener('google')
// addListener('baidu')

addListener2('google')
addListener2('baidu')

foo.emit('x')
