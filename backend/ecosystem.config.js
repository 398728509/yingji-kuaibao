module.exports = {
  apps: [{
    name: 'yingji-backend',
    script: './app.js',
    cwd: '/home/ubuntu/yingji-kuaibao/backend',
    env: {
      PORT: '3001',
      NODE_ENV: 'production',
      JWT_SECRET: 'c7b83bb4d75d57895315ff8b159eff5ed229c48b4f16d45ac3a1ac1ec33c8e21'
    }
  }]
}
