cb = {
    reg() {
        console.log('this is reg cb')
        if (this.call) {
            console.log('this set correctly')
            this.call()
        } else {
            console.log(this)
        }
    },
    call: () => {
        console.log('this is call cb')
    },
}

cb.reg()

let testThis = {
    x: 12,
    y: 20,
    add({ a, b, c }) {
        console.log(`a:${a} - b:${b} - c:${c()}`)
        let d = a + b + c()
        console.log(d)
    },
    test() {
        //the result is NaN
        this.add({
            a: this.x,
            b: this.y,
            c: () => {
                //this here is testThis, NOT the object literal here
                return this.a + this.b
            },
        })
    },
    test2() {
        //64 as expected
        this.add({
            a: this.x,
            b: this.y,
            c: () => {
                return this.x + this.y
            },
        })
    },
    test3() {
        //NaN
        console.log(`this in test3:${this}`)
        this.add({
            a: this.x,
            b: this.y,
            c() {
                //this here is the global object
                console.log(`this in c():${this}`)
                return this.x + this.y
            },
        })
    },
}

testThis.test3()
