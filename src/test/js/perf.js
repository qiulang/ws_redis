// var timeit = require('qtimeit')
const { performance } = require('perf_hooks')

var count = 2000
// var count = 500

async function test_async(n) {
    if (n == count) return
    await test_async(n + 1)
}

function test_callback(n, cb) {
    if (n == count) return cb()
    test_callback(n + 1, cb)
}

function test_sync(n) {
    if (n == count) return
    test_sync(n + 1)
}

async function onepass() {
    for (let index = 0; index < 15; index++) {
        await test_async(0)
    }
}

async function testConsole(total) {
    console.time('async')
    for (let index = 0; index < total; index++) {
        onepass()
    }
    console.timeEnd('async')
}

async function testPerf(total) {
    let t0 = performance.now()
    // performance.mark('async-start')
    for (let index = 0; index < total; index++) {
        onepass()
    }
    // performance.mark('async-end')
    // performance.measure('async', 'async-start', 'async-end')
    let t1 = performance.now()
    let averg = (t1 - t0) / total
    console.log(`With performance.now(): ${averg} milliseconds.`)
}

function test2(repeat) {
    // onepass()
    for (let index = 0; index < repeat; index++) {
        testPerf(10)
    }
}

function test3(repeat) {
    onepass()
    for (let index = 0; index < repeat; index++) {
        testConsole(10)
    }
}

async function main() {
    let t1 = performance.now()
    test2(10)
    let t2 = performance.now()
    console.log(`With performance.now(): ${t2-t1} milliseconds.`)
}

main()

// test3(10)

async function test() {
    var t0 = performance.now()
    for (let index = 0; index < 15; index++) {
        await test_async(0)
    }
    var t1 = performance.now()
    console.log('With performance.now() ' + (t1 - t0) + ' milliseconds.')

    //async
    console.time('async')
    for (let index = 0; index < 15; index++) {
        await test_async(0)
    }
    console.timeEnd('async')

    // callback
    // for (let index = 0; index < 15; index++) {
    //     // let begin = Date.now()
    //     console.time('callback')
    //     test_callback(0, () => {
    //         // let end = Date.now()
    //         // let delta = end - begin
    //         // console.log(`callback ${delta}`)
    //         console.timeEnd('callback')
    //     })
    // }
    // sync
    // console.time('sync')
    // for (let index = 0; index < 15; index++) {
    //     test_sync(0)
    // }
    // console.timeEnd('sync')
}

// test()

// timeit(5, async () => {
//     for (let index = 0; index < 15; index++) {
//         await test_async(0)
//     }
// })
