module.exports = {
  apps: [
    {
      name: 'pavilion-ws',
      script: './ws-server/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'music-api',
      script: './server/python-api/music_api.py',
      interpreter: 'python3',
      instances: 1,
      autorestart: true,
      watch: false
    }
  ]
};
