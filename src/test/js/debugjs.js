let debug = require('debug')
debug.enable('foo:*,-foo:bar')
let namespaces = debug.disable()
console.log(namespaces)
