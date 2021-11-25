let counter = 0
//https://stackoverflow.com/questions/46004290/will-async-await-block-a-thread-node-js

async function ic() {
  let test = new Promise((resolve) => {
    counter++
    resolve()
  })
  await test
  console.log('why')
  return counter
}

let a = await ic()
// let a = ic()
console.log(a)
