'use strict'

class Hero {
  constructor(heroName) {
    this.heroName = heroName
  }
  logName = () => {
    console.log(this.heroName)
  }
}
const batman = new Hero('Batman')
batman.logName()

let Hero2 = {
  heroName: 'Batman2',
  logName: () => {
    console.log(this.heroName)
  },
}

// Hero2.logName()
// return

var obj = {
  // does not create a new scope
  i: 10,
  b: () => console.log(this.i, this),
  c: function () {
    console.log(this.i, this)
  },
}

// obj.c()

// var objF = function test() {
//   // does not create a new scope
//   return {
//     i: 10,
//     b: () => console.log(this.i, this),
//     c: function () {
//       console.log(this.i, this)
//     },
//   }
// }

// objF().b()

var obj2 = {
  b: () => console.log(this),
}

// obj2.b()

function check(arr) {
  if (arr.length == 2) {
    return { match: true }
  }
  let a = arr[0]
  let b = arr[1]
  let c = arr[2]
  let fn = arr[3]
  let d = 'any'
  if (typeof fn === 'function') {
    return { match: false, input: { a, b, c, d, fn } }
  }
  d = arr[3]
  if (arr.length == 4) {
    console.log('no callback parameter')
    return { match: false, input: { a, b, c, d, fn: undefined } }
  }
  fn = arr[4]
  return { match: false, input: { a, b, c, d, fn } }
}

function inputTest({ a, b, c, d = 'any' }, fn) {
  console.log(arguments)
  const { match, input } = check([...arguments])
  if (!match) {
    ;({ a, b, c, d, fn } = input)
  }
  if (fn) fn({ a, b, c, d })
}

// function inputTest2({ a, b, c, d = 'any' }, fn) {
//   console.log(arguments)
//   if (fn) fn({ a, b, c, d })
// }

// inputTest2({ a: 1, b: 2, c: 3 }, (cb) => {
//   console.log('test 2:1:', cb)
// })

inputTest({ a: 1, b: 2, c: 3 }, (cb) => {
  console.log('test match 1:', cb)
})

inputTest({ a: 1, b: 2, c: 3, d: 'finger' }, (cb) => {
  console.log('test match 2:', cb)
})

inputTest(1, 2, 3, (cb) => {
  console.log('test mismatch 3:', cb)
})

inputTest(1, 2, 3, 'finger', (cb) => {
  console.log('test mismatch 4:', cb)
})

console.log('test mismatch 5:no callback')
inputTest(1, 2, 3)
