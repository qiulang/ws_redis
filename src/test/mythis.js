'use strict'
let _ = require('lodash')

function messageHandler(op_code, msg) {
  let name = 'qiu'
  const handle = {
    name: 'lang',
    call_in() {
      let name = ' why '
      console.log('show my name')
      console.log(this.name)
    }
  }
  let tmp = handle[op_code].bind(this)
  tmp()
}

//messageHandler('call_in', 2)

let handler = {
  name: 'qiulang',
  messageHandler(op_code, msg) {
    const handle = {
      name: 'lang',
      call_in() {
        console.log('show my name')
        console.log(this.name)
      }
    }
    // let tmp = handle[op_code].bind(this)
    let tmp = handle[op_code]
    tmp()
  },
  again() {
    console.log(this.name)
  },
  h2: {
    // name: 'kkk',
    msg() {
      console.log(this.name)
    }
  },
  h3: () => {
    let name = 'hi'
    console.log(this.name)
  }
}

// handler.messageHandler('call_in', 2)

// handler.h2.msg()
// //https://stackoverflow.com/a/17514482/301513
// // handler.h2.msg.bind(handler)()
// handler.h2.msg()
// handler.h3()

var obj = {
  // does not create a new scope
  i: 10,
  b: () => console.log(this.i, this),
  c: function() {
    console.log(this.i, this)
  }
}

// obj.b() // prints undefined, Window {...} (or the global object)
// obj.c() // prints 10, Object {...}

let person = {
  name: 'Jim',
  test: console.log(this.name), // true
  // test() {
  //   console.log(this.name)
  // },
  // test: () => console.log(this.name),
  sayName: () => {
    console.log(this) // true
  }
}

//person.sayName()
person.test

let t1 = _.map(''.split(','), d => +d)
let t2 = _.map('', d => +d)
console.log(t1, t2)

let a = { you: 'qiu', he: 'tong' }
let b = { you: 'tong', she: 'wei' }
let c = { ...a, ...b }
console.log(c)
c = { ...b, ...a }
console.log(c)
