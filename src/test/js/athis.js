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

Hero2.logName()
return

var obj = {
  // does not create a new scope
  i: 10,
  b: () => console.log(this.i, this),
  c: function () {
    console.log(this.i, this)
  },
}

obj.c()

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

obj2.b()
