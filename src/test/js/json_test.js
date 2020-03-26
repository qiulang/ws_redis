const msg =
  '{"op_code":"change_status","ccgeid":243,"seid":134,"uid":1000056188,"data":{"number":"1056","status":1}}'

//JSON names require double quotes. JavaScript names do not.
//https://www.w3schools.com/js/js_json.asp

//Make sure the text is written in JSON format, or else you will get a syntax error.
//https://www.w3schools.com/js/js_json_parse.asp

//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/JSON_bad_parse

// const msg =
//   '{op_code:change_status,ccgeid:243,seid:134,uid:1000056188,data:{number:1056,status:1}}'

try {
  var pushData = JSON.parse(msg)
} catch (err) {
  console.log('not a valid json string')
}

console.log(pushData.data)
namespaces = ' app:debug, app:*'
const split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/)
for (i of split) {
  console.log(`b:${i}`)
}

const Moudles = ['app', 'phone-bar']

let debug = Moudles.reduce((a, b) => `${b}*,${a}`, '')
console.log(`${debug}`)

function overload({ un, pwd, type = 1, number }, cb) {
  console.log(`${un}:${pwd}:${type}:${number}`)
  if (!cb || typeof cb != 'function') {
    console.log('no callback provided')
  } else {
    cb(type)
  }
}

function o2(un, pwd, fn) {
  return overload({ un, pwd }, fn)
}

o2('qiu', 'lang', input => {
  console.log(`callback input:${input}`)
})

o2('qiu', input => {
  console.log(`callback input:${input}`)
})
