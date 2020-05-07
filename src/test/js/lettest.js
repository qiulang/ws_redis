// for (let i = 0; i < 10; i++) {
//   console.log(i)
//   setTimeout(function() {
//     console.log('The number is ' + i)
//   }, 1000)
// }
//https://wesbos.com/for-of-es6/

var multiStr = 'This is the first line' + 'This is the second line' + 'This is more...'
console.log(multiStr)

var multiStr = 'This is the first line \
	This is the second line \
This is more...'

console.log(multiStr)

multiStr = `This is the first line \
This is the second line \
This is more...`

console.log(multiStr)

multiStr = `
This is the first line
  This is the second line
    This is more...`

console.log(multiStr)
