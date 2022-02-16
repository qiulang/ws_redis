import { setTimeout } from 'timers/promises'
const delayedValue = await setTimeout(5000, 'some value')

console.log(delayedValue)
