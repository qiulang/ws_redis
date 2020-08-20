const log = require('debug')
let debug = log('app:debug')
//https://www.npmjs.com/package/debug#output-streams ,写到stdout
debug.log = console.log.bind(console)
//这样pm2 log 就都从 /root/.pm2/logs/ws-redis-error.log 看吧
let info = log('app:info')
// info.log = console.log.bind(console)
let warn = log('app:warn')
// warn.log = console.log.bind(console)

//以后其他模块如果要用debug，ns建议用本模块名字，app:xxx:debug,
//缺省把本模块的debug打开，但info和warn 整个进程共用一个
module.exports = { debug, info, warn }
