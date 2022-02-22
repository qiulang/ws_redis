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
