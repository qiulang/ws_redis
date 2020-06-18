// for (let i = 0; i < 10; i++) {
//   console.log(i)
//   setTimeout(function() {
//     console.log('The number is ' + i)
//   }, 1000)
// }
//https://wesbos.com/for-of-es6/

// var multiStr = 'This is the first line' + 'This is the second line' + 'This is more...'
// console.log(multiStr)

// var multiStr = 'This is the first line \
// 	This is the second line \
// This is more...'

// console.log(multiStr)

// multiStr = `This is the first line \
// This is the second line \
// This is more...`

// console.log(multiStr)

// multiStr = `
// This is the first line
//   This is the second line
//     This is more...`

// console.log(multiStr)

function rejectme() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      return reject(400)
    }, 200)
  })
}

async function test() {
  try {
    let tmp = await rejectme()
    console.log(`result: ${tmp}`)
  } catch (error) {
    console.log(`error:${error}`)
  }
}

test()
