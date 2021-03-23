cache = {}
function resolveAfter2Seconds(x) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`resolved ${x}`)
    }, 2000)
  })
}

async function asyncCall(x) {
  let now = Date.now()
  console.log(`calling @${now}`)
  let cached = cache[x],
    time = 0,
    result
  if (cached) {
    time = cached['time']
    result = cached['result']
  } else {
    console.log(`no cache, call async function`)
  }
  if (now - time > 100) {
    if (cached) {
      console.log(`cache is bad, call async function`)
      // cached['time'] = now
    }
    result = resolveAfter2Seconds(now)
    cache[x] = { time: Date.now(), result: result }
  } else {
    console.log(`call async function again`)
  }
  let tmp = await result
  console.log(`result`, tmp)
  return tmp
}

let r = asyncCall(1)
console.log(`return`, r)
setTimeout(() => {
  r = asyncCall(1)
  console.log(`return`, r)
  r = asyncCall(1)
  console.log(`return`, r)
  setTimeout(async () => {
    console.log('又等了4秒')
    let r2 = await r
    console.log(`return`, r2)
  }, 4000)
}, 3000)
