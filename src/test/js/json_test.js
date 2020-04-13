const _ = require('lodash')
const msg =
  '{"op_code":"change_status","ccgeid":243,"seid":134,"uid":1000056188,"data":{"number":"1056","status":1}}'

//JSON names require double quotes. JavaScript names do not.
//https://www.w3schools.com/js/js_json.asp

//Make sure the text is written in JSON format, or else you will get a syntax error.
//https://www.w3schools.com/js/js_json_parse.asp

//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/JSON_bad_parse

// const msg =
//   '{op_code:change_status,ccgeid:243,seid:134,uid:1000056188,data:{number:1056,status:1}}'

try {
  var pushData = JSON.parse(msg)
} catch (err) {
  console.log('not a valid json string')
}

console.log(pushData.data)
namespaces = ' app:debug, app:*'
const split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/)
for (i of split) {
  console.log(`b:${i}`)
}

const Moudles = ['app', 'phone-bar']

let debug = Moudles.reduce((a, b) => `${b}*,${a}`, '')
console.log(`${debug}`)

function overload({ un, pwd, type = 1, number }, cb) {
  console.log(`${un}:${pwd}:${type}:${number}`)
  if (!cb || typeof cb != 'function') {
    console.log('no callback provided')
  } else {
    cb(type)
  }
}

function o2(un, pwd, fn) {
  return overload({ un, pwd }, fn)
}

o2('qiu', 'lang', (input) => {
  console.log(`callback input:${input}`)
})

o2('qiu', (input) => {
  console.log(`callback input:${input}`)
})

let dataStr =
  `[{"id":7148,"seid":134,"ccgeid":243,"ivr_flow_name":"淄博太保支付流程-新",` +
  `"type":8,"is_default":0,"is_draft":0,"is_modify":0,"status":1,"description":"",` +
  `"variables":[{"id":1869,"seid":134,"ccgeid":243,"ivr_flow_id":7148,"type":0,` +
  `"label":"card_type","name":"卡类型","data_type":1,"default_value":null,"data_secret":0,` +
  `"is_used":false},{"id":1870,"seid":134,"ccgeid":243,"ivr_flow_id":7148,"type":1,` +
  `"label":"DEBIT_CARD_NUMBER","name":"银行卡卡号","data_type":0,` +
  `"default_value":null,"data_secret":2,"is_used":true},{"id":1871,"seid":134,` +
  `"ccgeid":243,"ivr_flow_id":7148,"type":0,"label":"CREDIT_CARD_NUMBER","name":"信用卡卡号",` +
  `"data_type":0,"default_value":null,"data_secret":2,"is_used":true},` +
  `{"id":1872,"seid":134,"ccgeid":243,"ivr_flow_id":7148,"type":0,"label":"CREDIT_CARD_VALIDITY",` +
  `"name":"信用卡有效期","data_type":0,"default_value":null,"data_secret":2,"is_used":true},` +
  `{"id":1873,"seid":134,"ccgeid":243,"ivr_flow_id":7148,"type":1,` +
  `"label":"CREDIT_CARD_VERCODE","name":"信用卡校验码","data_type":0,"default_value":null,` +
  `"data_secret":2,"is_used":true},{"id":1874,"seid":134,"ccgeid":243,"ivr_flow_id":7148,` +
  `"type":1,"label":"EXCURESULT","name":"执行结果","data_type":1,"default_value":null,` +
  `"data_secret":0,"is_used":true},{"id":1875,"seid":134,"ccgeid":243,"ivr_flow_id":7148,` +
  `"type":1,"label":"input_key_len","name":"收键长度","data_type":1` +
  `,"default_value":null,"data_secret":0,"is_used":true},{"id":1876,"seid":134,` +
  `"ccgeid":243,"ivr_flow_id":7148,"type":1,"label":"input_timeout_num","name":` +
  `"收键超时次数","data_type":1,"default_value":null,"data_secret":0,"is_used":true},` +
  `{"id":1877,"seid":134,"ccgeid":243,"ivr_flow_id":7148,"type":1,"label":"input_err_num",` +
  `"name":"收键错误次数","data_type":1,"default_value":null,"data_secret":0,"is_used":true}],` +
  `"created_at":"2020-03-26 09:39:47","updated_at":"2020-04-01 13:37:03"}]`

try {
  var [ivrData] = JSON.parse(dataStr)
  console.log(ivrData.ivr_flow_name)
  let ivr_flow_name = ivrData.ivr_flow_name
  var ivr = { ivr_flow_name }
  // for (const variable of ivrData.variables) {
  //   let name = variable.name
  //   let label = variable.label
  //   console.log(`name:${name} -- label:${label}`)
  // }

  let vars = ivrData.variables.filter((v) => v.type === 0)
  if (vars.length <= 0) return
  let ivrFormItem = vars
  let keys = vars.map((v) => v.label)
  // let params = {}
  // for (let idx of keys) {
  //   params[idx] = 'qiu'
  // }
  // console.log(`key:${keys} vs param:${JSON.stringify(params)}`)

  console.log(`reduce test ${vars}`)
  params = vars.reduce((acc, item) => {
    acc[item.label] = ''
    return acc
  }, {})
  console.log(`param:${JSON.stringify(params)}`)

  // let array = Object.entries(params)
  // console.log(`key:${array}`)

  // [].ivr_flow_name
  // [].variables[].name
  // [].variables[].label

  // ivr['variables'] = []
  // for (let i = 0; i < ivrData.variables.length; i++) {
  //   let name = _.get(ivrData, `variables[${i}].name`)
  //   let label = _.get(ivrData, `variables[${i}].label`)
  //   // console.log(`again name:${name} -- label:${label}`)
  //   ivr['variables'].push({ name, label })
  // }
  // console.log(`${JSON.stringify(ivr)}`)
} catch (err) {
  console.log('not a valid json string')
}

function compose(path, json) {
  let subpath = path.split('.')
  let path2 = ''
  for (let sub of subpath) {
    let s2 = sub
    if (sub.endsWith('[]')) {
      s2 = sub.substring(0, sub.length - 2)
    }
    path2 += s2
    let tmp = _.get(json, path2)
    //for ()
  }
}

const CALL_TYPE = (() => {
  const customer = 0
  const seat = 1
  const predict = 3
  return {
    customer,
    seat,
    predict,
    [customer]: {
      label: '呼入',
      key: 0,
    },
    [seat]: {
      label: '呼出',
      key: 1,
    },
    [predict]: {
      label: '预测式外呼',
      key: 3,
    },
  }
})()

const { customer: callIn, seat: callOut } = CALL_TYPE
console.log(`${callIn}, ${callOut}`)

const msg2 = {
  hello: {
    qiu: 'lang',
  },
  data: {
    reason: null,
    fail: 2,
  },
}

let reason = _.get(msg2, 'data.reason', 0)

const callFailedReason = (code) => {
  switch (code) {
    case null:
    case 0:
      return '成功'
    case 29:
      return '通话已被强拆'
    case 30:
      return '通话已被拦截'
    // case undefined:
    //   return '不知道什么原因'
    default:
      return '未知原因'
  }
}

console.log(`reason ${callFailedReason()}`)
