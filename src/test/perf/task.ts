#! /usr/bin/env node --no-deprecation

const cluster = require('cluster');
const crypto_cmd = require('crypto')
const axios = require('axios')
var randomstring = require('randomstring')
const debug_cmd = require('debug')
const _ = require('lodash')
const yargs = require('yargs')
const { hrtime } = require('node:process');

const server = 'https://docker1.emicloud.com/'
const switchNumber = '02566687671'
const password = 'u123456'
const is_ccgeid = 1
const seid = '134'
const ccgeid = '243'
const taskid ='1254' 
const groups = ["25556","25557","25558","25559","25560","25561","25562",
"25563","25564","25565","25566","25567","25568","25569"]
const uids = ["1001071438","1001071439","1001071440","1001071441","1001071442",
"1001071443","1001071444","1001071445","1001071446","1001071447","1001071448",
"1001071449","1001071450","1001071451"]

let number = '25556' //工号
let userid = '1001071438' //25556
let token = 'unknown'
let log = debug_cmd(`perf:task`)

interface result_type {
  code:number,
  data:any //data 可能的类型确实不清楚，图省事any
}

const axiosReq = axios.create({
  baseURL: 'https://emicall-cmb.emicloud.com/',
  headers: { source: 'client.bs' },
})

function sha256(secret:string) {
  return crypto_cmd.createHash('sha256').update(secret).digest('hex')
}

function timestampINS() {
  return Math.ceil(new Date().getTime() / 1000)
}

async function request({ url, body, headers = {}, method = 'post' }:
  {url:string,body:any,headers?:any,method?:string}) : Promise<result_type|boolean> {
  if (_.isEmpty(headers) || token !='unknown') {
    headers = { token }
  }
  let param: {[key: string]: any} = { //图省事，因为要加属性就在下面
    url,
    method,
    headers
  }
  //method 不对，服务器返回 405
  if (method == 'post') {
    param.data = body
  } else {
    param.params = body
  }
  try {
    const result = await axiosReq(param)
    if (result.status != 200) {
      log(`Failed to ${url}`)
      return false
    } else {
      return result.data
    }
  } catch (err) {
    log(err)
    log(`---- Failed to ${url} using ${JSON.stringify(body)}`)
    return false
  }
}

async function getToken() {
  let authType = 'signature'
  let source = 'client.bs'
  let loginType = 1
  let nonce = randomstring.generate(32)
  let timestamp = timestampINS()
  let domain = 'docker1.emicloud.com'
  const seat = `${number}@${switchNumber}`

  let str =
    `auth-type=${authType}&login_type=${loginType}` +
    `&nonce=${nonce}&seat=${seat}&source=${source}` +
    `&timestamp=${timestamp}&signatureKey=${password}`
  let signature = sha256(str).toString().toUpperCase()

//   log(`signature :${signature} is about to get token`)

  const headers = {
    'auth-type': 'signature',
    signature,
    seat,
    nonce,
    timestamp,
    domain,
    source,
  }
  log(`user :${number} is about to start`)
  let result = await request({
    url: '/user/bsToken',
    body: { login_type: loginType },
    headers,
  })
  if (typeof result == "boolean") {
    log(`why did calling /user/bsToken fail?`)
    return
  }
  if (result.code != 200) {
    log(`Got token failed`)
    return
  }
//   log(`/user/bsToken response ${JSON.stringify(result)}`)
  token = result.data.token
  log(`Got token:${token},可以取task了`)
}

async function lock(call_later:string) {
    let url = `/preview_task/lockCustomer/${seid}/${ccgeid}/${taskid}/${userid}`
    let result = await request({
      url,
      body:{"call_later":call_later}
    })
    if (typeof result == "boolean") {
      log(`why did calling /preview_task/lockCustomer fail?`)
      return
    }
    log(`锁定这个弹屏任务: ${url}, call_later:${call_later} : ${result.data.id}`)
    if (result.code != 200) {
      log(`锁定这个弹屏任务的客户失败`)
      return
    }
    return result.data.id
}

async function main() {
    let call_later = ""
    number = process.env.user! //分机号
    userid = process.env.uid!
    log = debug_cmd(`perf:${number}`)
    await getToken()
    const startTime = process.hrtime()
    for (let index = 0; index < 6; index++) {
        let tid = await lock(call_later)
        if (!tid)  break
        if (call_later.length > 0) {
            call_later = `${call_later},${tid}`
        } else {
            call_later = `${tid}`
        }
    }
    const diff = hrtime(startTime) //hrtime 返回数组
    const sec = diff[0] * 1000 + diff[1] / 1000000
    log(`---- 完成锁定这个弹屏任务用时: ${sec}ms`)
    //https://stackoverflow.com/questions/43312500/what-is-the-difference-between-worker-kill-vs-process-exit-in-node-js
    //https://stackoverflow.com/questions/14284351/nodejs-cluster-disconnect-shutdown
    //The worker is an EventEmitter without it cluster won't exit
    process.exit(0)
}

function start() {
    if (cluster.isMaster) {
        const startTime = process.hrtime();
        for (let i = 0; i < groups.length; i++) {
            cluster.fork({user:groups[i],uid:uids[i]}); //set different env for each worker
        }
        let finished = 0
        cluster.on('exit', function() {
        finished +=1
        if (finished == groups.length) {
            const diff = hrtime(startTime);
            const sec = diff[0] * 1000 + diff[1] / 1000000
            log(`-----  总共耗时 ${sec}ms`)            
        }
        })
    }
    else {
        log(`Worker ${process.pid} started with ${process.env.user}:${process.env.uid}`);
        main()
    }
}

start()