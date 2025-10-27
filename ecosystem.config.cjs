module.exports = {
  apps: [
    {
      name: 'novel-analyzer-frontend',
      script: 'npx',
      args: 'serve -s frontend -l 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}