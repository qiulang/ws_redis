'use strict'
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
    msg() {
      console.log(this.name)
    }
  }
}

// handler.messageHandler('call_in', 2)

handler.h2.msg()
//https://stackoverflow.com/a/17514482/301513
handler.h2.msg.bind(handler)()
