#!/usr/bin/env node
// var argv = require('yargs/yargs')(process.argv.slice(2)).boolean(['o']).describe('only').argv
// console.dir([argv.o])
// console.dir(argv._);

let a1 = [100, 200, 5, 23, -1, 230]
let b = a1.some((v, i) => {
  console.log(v, i)
  return v < 0
})

console.log(b)
