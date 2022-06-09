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