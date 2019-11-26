const log = require('debug')
let debug = log('app:debug')
//https://www.npmjs.com/package/debug#output-streams ,写到 stdout, 这样pm2 log才能正常看到
debug.log = console.log.bind(console)
let info = log('app:info')
info.log = console.log.bind(console)
let warn = log('app:warn')
warn.log = console.log.bind(console)

//以后其他模块如果要用debug，ns建议用本模块名字，不要用app:xxx
//缺省该模块debug不打开，但可以动态打开
module.exports = { debug, info, warn }
