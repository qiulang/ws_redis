const R = require('ramda')
const _ = require('lodash')

const employees = [
  { name: 'Jean-Luc Picard', age: 59, role: 'manager', email: 'jp@abc.com' },
  { name: 'Will Riker', age: 39, role: 'worker', email: 'wr@abc.com' },
  { name: 'Deanna Troi', age: 34, role: 'worker', email: 'dt@abc.com' },
]

let works = employees.filter((item) => item.role == 'worker')
works.sort((a, b) => a.age - b.age)
console.log(works)

let sortByAge = R.pipe(
  R.filter((item) => item.role == 'worker'),
  R.sort((a, b) => a.age - b.age)
  //   R.sortBy(R.prop('age'))
)

works = sortByAge(employees)
console.log(works)

let sortByAge2 = R.pipe(
  R.filter(R.where({ role: R.equals('worker') })), //Each of the spec's own properties must be a predicate function.
  R.sortBy(R.prop('age'))
)
works = sortByAge2(employees)
console.log(works)

const euro = [29.76, 41.85, 46.5]

const above30 = euro.reduce((total, amount) => {
  if (amount > 30) {
    total.push(amount)
  }
  return total
}, [])

console.log(above30)

var str = 'Lorem ipsum dolor sit amet consectetur adipiscing elit'
let strArray = str.split(' ').map((item) => ({ word: item, length: item.length }))
let biggest = strArray.reduce((max, cur) => (cur.length > max.length ? cur : max), strArray[0])
console.log(biggest)

let longgest = R.pipe(
  R.split(' '),
  R.map((item) => ({ word: item, length: item.length })),
  R.reduce((max, cur) => (max.length > cur.length ? max : cur), { length: 0 })
)
let tmp = longgest(str)
console.log(tmp)

// const compose = (...fns) => (...args) =>
//   fns.reduceRight((res, fn) => [fn.call(null, ...res)], args)[0]

// const compose2 = (f, g) => (x) => f(g(x))
// var splitBySpace = (s) => s.split(' ')

// let l2 = compose2(
//   _.map((item) => ({ word: item, length: item.length })),
//   _.split(' ')
//   //   splitBySpace
// )
// console.log(l2(str))
