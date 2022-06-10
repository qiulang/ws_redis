const axios = require('axios')
axios.get("https://emicall-cmb.emicloud.com/captcha",{timeout:10})
     .then(res => {
         console.log(JSON.stringify(res.data))
     })
     .catch(err => {
         console.log("should be timeout")
         console.log(err.code)
         console.log(err.message)
         console.log(err.stack)
     })

let userinfo = {
    seid:"1",
    ccgeid:"2"
}

let result = {
    code:200,
    status:"ok",
    data:{
        loginCode:"211",
        toke:"dddd"
    }
}

let v = {...userinfo,...result.data}
console.log(v)
