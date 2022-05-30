#! /usr/bin/env node --no-deprecation

const crypto = require('crypto')
const axios = require('axios')
var randomstring = require('randomstring')
const debug = require('debug')
const log = debug("wechat:web")
const _ = require('lodash')
const yargs = require('yargs')

let websocket = require('./socket')
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
})


const server = 'https://docker1.emicloud.com/'
const userid = '1000988323' //7820
const switchNumber = '02566687671'
let password = 'welcome123'
const accounts = {
  chl:[6666,'Xl@126.com'],
  ql:[7820,'welcome123']
}

const is_ccgeid = 1

let token = 'unknown'
let uid = "unknown"
let seid = 'unknown'
let ccgeid = 'unknown'
let mobile = '13910134045'
let groupid = 'unknown'
let number = 'unknown' //工号
let groups
let socket
let tasks

let buff = Buffer.from(password)
let base64data = buff.toString('base64')

const sleep = (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

const axiosReq = axios.create({
  baseURL: 'https://emicall-cmb.emicloud.com/',
  headers: { source: 'client.wechat' },
})

function sha256(secret) {
  return crypto.createHash('sha256').update(secret).digest('hex')
}

function timestampINS() {
  return Math.ceil(new Date().getTime() / 1000)
}

async function request({ url, body, headers = {}, method = 'post' }) {
  if (_.isEmpty(headers) || token !='unknown') {
    headers = { token }
  }
  let param = {
    url: url,
    method: method,
    headers: headers,
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

async function getToken(name,only) {
  let account = accounts[name] ?? accounts.ql
  number = account[0]
  password = account[1]

  let authType = 'signature'
  let source = 'client.wechat'
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

  log(`signature :${signature} is about to get token`)

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
    url: 'wechat/user/wechatToken',
    body: { login_type: loginType },
    headers,
  })
  if (result.code != 200) {
    log(`Got token failed`)
    return
  }
  //https://flaviocopes.com/javascript-destructure-object-to-existing-variable/
  uid = result.data.id;
  ({seid,ccgeid,token} = result.data)
  let user_id = `${seid}_${ccgeid}_${uid}`
  log(`Got token:${token},可以建立ws连接了 ${user_id}`)
  if (only) {
    readline.close()
    return
  }
  setWS(user_id)
  seatLogin()
}

async function getSeatInfo() {
  log(`登录后获取坐席相关信息，比如工号和分机号，还有是否已经绑定手机`)
  let result = await request({
    url: 'wechat/seat/seatInfo',
    method:'get'
  })
  let info = {
    "姓名":result.data?.displayname,
    "分机号":result.data?.number,
    "当前状态":result.data?.state,
    "所在组id":result.data?.call_group_id,
    "所在组名":result.data?.call_group_name,
    "已绑定号码":result.data?.mobile,
    "工号":result.data?.work_number,
    "分机号":result.data?.number
  }
  log(result)
  if (number != result.data?.work_number) {
    log(`wechat/seat/seatInfo 获取的工号有误， ${number} vs ${result.data?.work_number}`)
  }
  else if (mobile != result.data?.mobile) {
    log(`wechat/seat/seatInfo 绑定手机号有误， ${mobile} vs ${result.data?.mobile}`)
  }
  else if (groupid != result.data?.call_group_id) {
    log(`wechat/seat/seatInfo 签入技能组由服务器自动设置， ${groupid} vs ${result.data?.call_group_id}`)
  } else {
    log(`wechat/seat/seatInfo 获取信息与我们登录所选信息一致`)
  }
}

async function seatLogin() {
  log(`使用工号登录 ${number}`)
  const result = await request({
    url: 'wechat/BSClient/seatLogin',
    body: {
      switch_number: switchNumber,
      work_number: number, //number就是分机号
      password: base64data,
    },
  })
  if (result == false) {
    log('Failed to seatLogin')
    return
  }
  groups = result.data.groups.map(i=>({
    gid:i.gid,
    gname:i.name
  }))
  log(`${number}'s uid is ${uid} has seatLogin, 并获取坐席所在技能组, ${JSON.stringify(groups)}`)
  groupid = groups[0]['gid']
  //测试不调用 seatLogin 有什么问题
  // uid = "1000988323"
  // let user_id = "134_243_1000988323"
  /* readline 模拟小程序判断 */
  readline.question(`First time to use wechat with ${mobile}? `, async (bind='n') => {
    // readline.close() 都用完才能close
    //不然 seatCheckin 会回复 {"code":140000022,"info":"回拨话机号码未绑定"}
    if (bind =='y') {
      await bindPhone()
    } else {
      await seatCheckin()
    }
  })
}

async function bindPhone() {
  let result = await request({
    url: 'wechat/seat/sendSms',
    body: {
      mobile
    },
  })
  log(`send sms result:${JSON.stringify(result)}`)
  readline.question(`What's your sms code? `,async (code) => {
    result = await request({
      url: 'wechat/seat/bindPhone',
      body: {
        mobile,
        code
      },
    })
    log(`bindPhone result: ${JSON.stringify(result)}`)
    if (result.code == 200) {
      log(`绑定的手机号成功，可以迁入了`)
      await seatCheckin()
    } else {
      log(`绑定的手机号不成功，为什么？？`)
    }
  })
}

async function seatCheckout() {
  data = {
    seid,
    ccgeid,
    uid
  }
  const result = await request({
    url: 'wechat/BSClient/seatCheckout',
    body: data,
  })
  log(`seatCheckout ${JSON.stringify(data)}: result`)
  log(result)
  socket.close()
  readline.close()
}

function setWS(user_id) {
  log(`Connect to websocket server first before call seat/checkIn ${token}:${user_id}`)
  socket = websocket(server, { user_id, seid, ccgeid, token, uniqueId:'nodejs' })
  setTimeout(()=>{
    log(`seatCheckout in 60 seconds`)
    seatCheckout()
  },120000)
}

async function seatCheckin() {
  data = {
    // 小程序签入，没读技能组传参，就是按db存储的技能组处理的，db没存的，就给一个默认技能组，传参现在没用
    // call_group_id: groupid,
    // call_group_name: 'bs测试技能组',
    callintype: 4,
    device_number: mobile,
    preStatusId: 2,
    number,
    seid,
    ccgeid,
  }
  result = await request({
    url: 'wechat/seat/checkIn',
    body: data,
  })
  log(`wechat/seat/checkIn 所有技能组: ${JSON.stringify(result)}`)
  if (result == false) {
    log('Failed to seatCheckin')
    return
  }
  log(`${number} seatCheckin succeed!! CR会有登录消息通过ws通知`)
  await getSeatInfo()
  // await seatInformation()
}

async function makeCall() {
  readline.question('Do you want to make a call from your assigned tasks(t) or from your  call history(h), t/h?', async (where) =>{
    if (where == 'h') {
      readline.question('直接拨号就输入被叫号码，如果从通话记录选号请输入 y: ',async(number) => {
        if (number == 'y') {
          log('OK make a call from call history')
          await getCallRecord()
        } else if (!isNaN(number)) {
          log(`Call this number directly ${number}`)
          let callData = {
            ccgeid,
            cm_phone_type: 0, //个人电话呼叫传0  家庭传1 单位传2  自定义号码传3
            seid,
            uid,
            type:1,
            callee:number
          }
          log(`使用以下参数拨打 ${JSON.stringify(callData)}`)
          call(callData)
        }
      })
    } else {
      log('OK make a call from assigned tasks')
      await getTasks()
    }
  })
}

async function seatInformation() {
  result = await request({
    url: 'wechat/seat/state',
    method:'get'
  })
  if (result.code == 200) {
    // let states = result.data?.map(i=> ({'name':i.name,'order':i.order}))
    log(`seat/state 坐席可选状态:`)
    let states = result.data?.map(i=> {
      let state = {'name':i.name,'order':i.order}
      log(`${JSON.stringify(state)}`)
      return state
    })
    log(`一共 :${states.length} 状态`)
  }
  result = await request({
    url: 'wechat/customer-result/scheme',
    method:'get'
  })
  if (result.code == 200) {
    log(`customer-result/scheme 话后处理选项:`)
    let tmp = result.data?.result_option_settings
    let schemes = tmp?.map(i=>{
      let name = {name:i.name}
      if (i.children.length > 0) {
        name.subschemes = i.children.map(i=>i.name)
      }
      log(JSON.stringify(name))
      return name
    })
    log(`一共 :${schemes.length} 话后处理选项`)
  }
  await makeCall()
}

async function getTasks() {
  let result = await request({
    url: `wechat/preview_task/seat/${seid}/${ccgeid}/${uid}`,
    method:'get'
  })
  if (result.code == 200) {
    log(`wechat/preview_task/seat result 目前任务:`)
    tasks = result.data?.data?.map( i=> {
      let task = {
      "任务id":i.id,
      "任务名称":i.task_name,
      "任务状态":i.status,
      "客户总数":i.total_customers,
      "已呼叫客户数":i.customer_called,
      "任务未分配客户数":i.task_not_locked,
      "技能组未分配客户数":i.group_not_locked,
      "不再呼叫客户数":i.ustomer_aborted,
      "进度":i.process,
      "是否允许坐席操作":i.seat_not_call
      }
      log(JSON.stringify(task))
      return task
    })
    log(`一共 :${tasks.length} 任务`)
  }
  await lockOneCustomer()
}

async function lockOneCustomer() {
  readline.question(`which task you want to lock? `, async (t) => {
    log('如果这个任务未分配客户数是0，那锁定任务就会失败，报 {"code":161000130,"info":"本坐席已经没有获取当前任务客户的权限"}"')
    if (!tasks.some(i=> i["任务id"] == t)) {
      log('输入taskid不正确')
      return
    }
    let url = `wechat/preview_task/lockCustomer/${seid}/${ccgeid}/${t}/${uid}`
    result = await request({
      url
    }) 
    log(`锁定这个弹屏任务: ${url} :${JSON.stringify(result)}`)
    if (result.code != 200) {
      log(`锁定这个弹屏任务的客户失败`)
      return
    }
    //{"id":1779043,"task_id":971,"batch_id":1145,"cid":1713617,"auto_call_tel":"15645641235","cm_name":"test_1","service_gid":1000003218,"enc_number":"p9ZNF/d7wC5OhBK7JI6dkg=="}}
    let taskInfo = {
      "任务ptcid":result.data.id,
      "客户id":result.data.cid,
      "客户姓名":result.data.cm_name,
      "自动分配的客户的号码":result.data.auto_call_tel,
      "该号码的加密值":result.data.enc_number,
      "任务所在组":result.data.service_gid, //不再呼叫时候用
      "任务 batch_id":result.data.batch_id
    }
    log(taskInfo)
    let body = {
      cid:taskInfo["客户id"],
      encNumber:taskInfo["该号码的加密值"]
    }
    log(`获取弹屏任务的相关信息，主要是客户信息,而且 encNumber 必传，不然不返回客户信息, ${JSON.stringify(body)}`)
    result = await request({
      url: `wechat/preview_task/bombScreenTask/${seid}/${ccgeid}/${t}/${taskInfo["任务ptcid"]}`,
      body,
      method:'get'
    })
    log(`获取弹屏信息结果: ${result.code}`) 
    // log(result)
    let customer = result.data?.customer
    let batch_id = result.data.batch_id
    let customer_tels = result.data?.customer?.customer_tels?.[0] //customer如果是空就变成空数组，不然是object
    let numberId = customer_tels?.id
    let definedField = result.data?.customer?.definedField
    let cm_result = result.data?.cm_result
    let tel_info = result.data?.tel_info
    let ep_setting = result.data?.ep_setting
    log(`返回参数太复杂，要整理,我们需要的和接下去需要拨号呼叫相关的参数`)
    let callData = {
      ccgeid,
      cm_phone_type: 0, //个人电话呼叫传0  家庭传1 单位传2  自定义号码传3
      is_ignore_verify:1,
      patchId: batch_id,
      ptc_id: taskInfo["任务ptcid"],
      seid,
      taskId: t,
      uid,
      gid:taskInfo["任务所在组"]
    }
    if (numberId) {
      callData['boomScreenType'] = `task_${t}_${taskInfo["任务ptcid"]}`
      callData['numberId'] = numberId
      callData.type = 3
    } else {
      callData['boomScreenType'] = `task_runing_${taskInfo["任务ptcid"]}`
      // callData['boomScreenType'] = `task_${t}_${taskInfo["任务ptcid"]}`
      callData['encNumber'] = taskInfo["该号码的加密值"]
      callData.type = 5
    }
    log(`发起弹屏呼叫${JSON.stringify(callData)}`)
    call(callData)
    if (taskInfo["客户id"] == 0) {
      log('没有customer id 信息')
      return
    }
    log(`--------- 同时获取任务${t} 呼叫历史`)
    result = await request({
      url: `wechat/preview_task/customersForSeat/${seid}/${ccgeid}/${t}`,
      method:'get'
    }) 
    if (result.code == 200) {
      let history = result.data?.data?.map(i=>({
        "客户姓名":i.cm_name,
        "客户号码":i.auto_call_tel,
        "呼叫状态":i.status,
        "呼叫次数":i.call_times,
        "接通次数":i.answer_times,
        "话后处理结果":i.parent_cm_result_name + i.cm_result_name,
        "话后处理说明":i.cm_description
      }))
      log(history)
    }
  })
}

async function call(callData) {
  readline.question(`确认呼叫 y 还是放弃客户 n，还是放弃呼叫 nn, y/n/nn?`, async (answer) => {
    if (answer == 'y') {
      result = await request({
        url: `wechat/BSClient/callOut`,
        body:callData
      })
      log(`实际呼叫用户,呼叫结果:${JSON.stringify(result)}`)
      if (result.code == 200) {
        log(`呼叫中间状态，CR通过 ws 消息发给我们`)
      }
    } else if (answer == 'nn') {
      return
    } else {
      url =  `wechat/preview_task/abortCustomer/${seid}/${callData.taskId}/${callData.ptc_id}`
      body = {
        gid:callData.gid,
        remark:"ql test"
      }
      log(`放弃呼叫 ${url}`)
      log(body)
      result = await request({
        url,
        body
      })
      if (result.code == 200) {
        log(`放弃该客户，用户可决定是否接着锁定任务中的下一个客户`)
      } else if (result.code == 150000025) {
        log(`'任务客户已被回收，BS端处理是自动锁定任务中的下一个客户`)
      }
    }
  })

}

async function getCallRecord() {
  result = await request({
    url: `wechat/call_record/getCallRecordForBSSeat`,
    method:'get',
    body: {
      time_period:'2d',
      seid,
      ccgeid,
      uid
    }
  })
  if (result.code !=200) {
    log(`获取通话记录失败`)
    return
  }
  // log(result)
  callRecord = result.data.map(i=>({
    '通话类型': i.call_type,
    '总机号码': i.switch_number,
    '呼叫时间': i.initiate_time,
    '客户姓名':i.customer_name,
    '客户号码':i.outline_number,
    '客户号码加密值':i.encrypted_outline_number,
    '号码归属地':i.attribution,
    '通话技能组':i.service_group_name,
    '通话时长':i.valid_duration,
    'ivr时长':i.ivr_duration,
    '排队时长':i.total_enqueue_time,
    '客户振铃时长':i.customer_ring_duration,
    '坐席振铃时长':i.seat_ring_duration,
    '话后处理结果':i.cm_result,
    '话后处理说明':i.customer_result?.[0]?.['description'],
    '结束原因':i.stop_reason,
    '满意度':i.evaluate_value,
    '通话id':i.cc_number,
    "记录id":i.id
  }))
  log(callRecord)
  readline.question('输入需要重呼的id ',(callid) => {
    let item = callRecord.find(i=>i["记录id"] == callid)
    if (!item) {
      log('输入callid不正确')
      return
    }
    let callData = {
      ccgeid,
      cm_phone_type: 0, //个人电话呼叫传0  家庭传1 单位传2  自定义号码传3
      seid,
      uid,
      type:2,
      cc_number:item['通话id'],
      call_type: 1,
      encNumber:item['客户号码加密值'],
      initiator_pcall_id: "0",
      initiator_task_id: 0,
      is_ignore_verify: 1,
      ptc_id: 0
    }
    log(`使用以下参数拨打 ${JSON.stringify(callData)}`)
    call(callData)
  })
}

function main() {
  let argv = yargs.option('o', {
              default: false,
              describe: 'get token only',
              type: 'boolean',
            }).argv
  // 等同于
  // let argv = yargs.boolean(['o'])
  //           .describe('get token only')
  //           .argv
  getToken('ql',argv.o)
}

main()
