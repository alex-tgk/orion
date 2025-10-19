module.exports = {
  apps: [
    {
      name: 'auth',
      script: 'dist/main.js',
      cwd: './packages/auth',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        PORT: 3010,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'ai-wrapper',
      script: 'dist/main.js',
      cwd: './packages/ai-wrapper',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        PORT: 3200,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'gateway',
      script: 'dist/main.js',
      cwd: './packages/gateway',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        PORT: 3100,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'admin-ui',
      script: 'npx',
      args: 'serve -s dist -l 3000',
      cwd: './packages/admin-ui',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'document-intelligence',
      script: 'npx',
      args: 'serve -s dist -l 3001',
      cwd: './packages/document-intelligence-demo',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
