let debug = require('debug')
debug.enable('foo:*,-foo:bar')
let namespaces = debug.disable()
console.log(namespaces)

// var a = []
// a[5] = 5
// for (var x of a) {
//   // Shows only the explicitly set index of "5", and ignores 0-4
//   console.log(x)
// }

// const { setTimeout } = require('timers/promises')  nodejs 16

async function testTimer() {
  const delayedValue = await setTimeout(2000, 'some value')
  console.log(delayedValue)
}

// testTimer()
function jst() {
  try {
    let message = 'can you get'
    let pushData = JSON.parse(message)
  } catch (e) {
    console.log(`${JSON.stringify(e)}`)
    console.log(`${e}`)
  }
}

jst()
