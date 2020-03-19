const axios = require('axios')

const axiosReq = axios.create({
  baseURL: 'https://emicall-cmb.emicloud.com/',
  headers: { source: 'client.bs' }
})

const server1 = 'https://docker1.emicloud.com/'
