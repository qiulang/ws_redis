module.exports = {
  apps: [
    {
      name: 'ws_redis',
      script: 'index.js',
      //设置 instances https://pm2.keymetrics.io/docs/usage/cluster-mode/
      // instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      // 用debug有时间戳，不用再设置，但debug的时区要设置
      // log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        NODE_ENV: 'development',
        DEBUG: 'app:*'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
}
