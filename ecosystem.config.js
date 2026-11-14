module.exports = {
  apps: [{
    name: 'lanai-site',
    script: 'server.js',
    cwd: __dirname,
    exec_mode: 'fork',
    instances: 1,
    max_memory_restart: '400M',
    env: {
      NODE_ENV: 'production',
      TRUST_PROXY: '1',
      COOKIE_SECURE: '1'
    },
    out_file: 'logs/out.log',
    error_file: 'logs/err.log',
    time: true
  }]
};
