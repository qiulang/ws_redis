#! /usr/bin/env node --no-deprecation
const axios = require('axios')
const chalk = require('chalk')
const _ = require('lodash')
const user = 'qiulang'
const token = 'bc0c626de8a069b42e79d2ca312d5498dbfc9018'
const origin = 'https://docker1.emicloud.com'
let cache = {} //url:{tag,data}

const sleep = milliseconds => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

//使用 github 的 api 做实验，
//https://developer.github.com/v3/guides/getting-started/

const axiosReq = axios.create({
  //https://stackoverflow.com/questions/2044340/http-basic-authentication-whats-the-expected-browser-experience
  //curl -i -u qiulang:bc0c626de8a069b42e79d2ca312d5498dbfc9018 https://api.github.com/user
  // {
  //   baseURL: `https://${user}:${token}@api.github.com`
  // }
  baseURL: 'https://emicall-cmb.emicloud.com/',
  headers: {
    source: 'client.bs',
    origin
  }
})

let resInterceptors = response => {
  //https://stackoverflow.com/a/34245366/301513
  let etag = JSON.parse(response.headers.etag)
  if (etag) {
    console.log(chalk.cyan(`Get ${etag} succeed.`))
    cache[response.config.url]['etag'] = etag
  }
  return response
}

let resErrInterceptors = error => {
  if (!error.response || error.response.status != 304) {
    return Promise.reject(error)
  }

  const getCachedResult = cache[error.response.config.url]['data']
  if (!getCachedResult) {
    return Promise.reject(error)
  }
  const newResponse = error.response
  newResponse.status = 200
  newResponse.data = getCachedResult
  console.log(chalk.cyan(`Return data from cache.`))
  return Promise.resolve(newResponse)
}

axiosReq.interceptors.response.use(resInterceptors, resErrInterceptors)

async function request(url) {
  let config = { url }
  let tmp = cache[url]
  if (tmp) {
    config['headers'] = { 'If-None-Match': tmp.etag }
  } else {
    cache[url] = {}
  }
  console.log(chalk.cyan(`send request to ${url} with config ${JSON.stringify(config)}`))
  const result = await axiosReq(config)
  if (result.status != 200) {
    console.log(chalk.red(`Failed to ${url}`))
    return false
  } else {
    cache[url]['data'] = result.data
    return result.data
  }
}

async function cacheTestGithub() {
  let result = await request('/user')
  let plan1 = result.plan
  console.log('Sleep 1 second')
  await sleep(1000)
  result = await request('/user')
  let plan2 = result.plan
  if (_.isEqual(plan1, plan2)) {
    console.log(chalk.cyan(`Get cache data succeed.`))
  } else {
    console.log(chalk.red(`Get cache data fail.`))
  }
}

async function cacheTestBK() {
  console.log(chalk.cyan(`Getting logo.`))
  let result = await request('/logo')
  if (result.code == 200) {
    console.log(chalk.cyan(`Get logo Succeed!`))
  }
  console.log(chalk.cyan(`Getting logo again!`))
  result = await request('/logo')
  if (result.code == 200) {
    console.log(chalk.cyan(`Get logo Succeed!`))
  }
}

cacheTestBK()
