module.exports = {
  //https://doc.pm2.io/en/runtime/reference/ecosystem-file/
  //@TODO 仔细再看看
  apps: [
    {
      name: 'ws_redis',
      script: './src/index.js',
      //设置 instances https://pm2.keymetrics.io/docs/usage/cluster-mode/
      // instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      // 用debug有时间戳，但它只能是Date#toISOString()，差了8小时，不知道怎么设置本地时间
      // 找了很多方法也不行，干脆不要它输出时间格式了 DEBUG_HIDE_DATE
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      args: ['--color'], //for chalk
      // message: 'echo\n',
      env: {
        NODE_ENV: 'development',
        DEBUG: 'app:*',
        DEBUG_HIDE_DATE: true,
        DEBUG_COLORS: true //for debug
      },
      env_production: {
        NODE_ENV: 'production',
        DEBUG: 'app:*',
        DEBUG_HIDE_DATE: true,
        DEBUG_COLORS: true
      }
    }
  ]
}
