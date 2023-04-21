// var unexpectedJSON = '{a}'
// try {
//   JSON.parse(unexpectedJSON)
// } catch (e) {
//   console.log('Unexpected value in JSON')
// }

// try {
//   let message = 'can you get'
//   let pushData = JSON.parse(message)
// } catch (e) {
//   console.log('again')
// }

// let client

// function testC(c) {
//   console.log(`inside ${client}`)
//   client = c
// }

// testC("input")

// console.log(`outside ${client}`)

function m1() {
  //I need regex to match an email address
  const re = /\S+@\S+\.\S+/
  let email = 'qiulang@gmail.com'
  let arr = email.match(re)
  console.log(`1st ${arr}`)
  //I need regex to match an email address with group, 1st group is the name, 2nd group is the domain
  const re2 = /(\S+)@(\S+)\.(\S+)/
  let arr2 = email.match(re2)
  console.log(`2nd ${arr2}`)
  //I need SQL to match an email address with create up in 2020
  const sql = `SELECT * FROM users WHERE email = '${email}' AND created_at > '2020-01-01'`
  // eulidean algorithm, GCD
  function gcd(a, b) {
    if (b == 0) return a
    return gcd(b, a % b)
  }
}

m1()