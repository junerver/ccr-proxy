module.exports = {
  apps: [
    {
      name: 'ccr-proxy',
      script: 'proxy.js',
      instances: 1,            // 可改为 'max' 启用多线程
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      env_development: {
        NODE_ENV: 'development'
      },
      error_file: './logs/ccr-proxy-error.log',
      out_file: './logs/ccr-proxy-out.log',
      log_file: './logs/ccr-proxy-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000,
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',

      // 注意：CUSTOM_ROUTER_PATH 是CCR配置文件中的字段，不是环境变量
      // CCR配置文件位置：
      // - Windows: %APPDATA%\Claude\config.json
      // - macOS: ~/Library/Application Support/Claude/config.json
      // - Linux: ~/.config/Claude/config.json
    }
  ]
};
