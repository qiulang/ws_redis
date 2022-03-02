var unexpectedJSON = '{a}'
try {
  JSON.parse(unexpectedJSON)
} catch (e) {
  console.log('Unexpected value in JSON')
}

try {
  let message = 'can you get'
  let pushData = JSON.parse(message)
} catch (e) {
  console.log('again')
}

let client

function testC(c) {
  console.log(`inside ${client}`)
  client = c
}

testC("input")

console.log(`outside ${client}`)