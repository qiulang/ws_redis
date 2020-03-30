const axios = require('axios')

const axiosReq = axios.create({
  baseURL: 'http://localhost:3000/',
  headers: { source: 'client.bs' }
})

const server1 = 'https://docker1.emicloud.com/'

async function test() {
  try {
    const result = await axiosReq.get('/failme')
    // const result = await axiosReq.get('ghtoken')
    console.log(JSON.stringify(result.data))
  } catch (error) {
    // https://github.com/axios/axios#handling-errors
    console.log(JSON.stringify(error.response.data))
  }
}

test()
