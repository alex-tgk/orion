/**
 * PM2 Ecosystem Configuration for ORION AI Services
 *
 * This configuration manages the AI wrapper service and related infrastructure.
 * All AI CLI integrations (Claude, Copilot, Amazon Q, Gemini, Codex) are
 * accessible through the unified ai-wrapper service.
 *
 * Usage:
 *   pm2 start ecosystem.ai-services.config.js
 *   pm2 logs ai-wrapper
 *   pm2 restart ai-wrapper
 *   pm2 delete ai-wrapper
 */

module.exports = {
  apps: [
    {
      name: 'ai-wrapper',
      script: 'main.js',
      cwd: './dist/packages/ai-wrapper',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3200,

        // AI CLI Paths (auto-detected if in PATH)
        CLAUDE_CLI_PATH: process.env.CLAUDE_CLI_PATH || '/Users/acarroll/.local/bin/claude',
        COPILOT_CLI_PATH: process.env.COPILOT_CLI_PATH || '/usr/local/bin/gh',
        AMAZONQ_CLI_PATH: process.env.AMAZONQ_CLI_PATH || '/Users/acarroll/.local/bin/q',
        GEMINI_CLI_PATH: process.env.GEMINI_CLI_PATH || '/usr/local/bin/gemini',
        CODEX_CLI_PATH: process.env.CODEX_CLI_PATH || '/usr/local/bin/codex',

        // API Keys (for Gemini and Codex)
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,

        // Redis for caching AI responses
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
        REDIS_ENABLED: process.env.REDIS_ENABLED || 'true',

        // Execution settings
        AI_EXECUTION_TIMEOUT: 120000, // 2 minutes
        AI_MAX_PARALLEL_REQUESTS: 5,
        AI_RETRY_ATTEMPTS: 2,

        // Caching
        AI_CACHE_ENABLED: 'true',
        AI_CACHE_TTL: 3600, // 1 hour

        // Fallback strategy
        AI_FALLBACK_ENABLED: 'true',
        AI_FALLBACK_ORDER: 'claude,copilot,amazonq,gemini,codex',

        // CORS
        CORS_ORIGIN: 'http://localhost:3000,http://localhost:3001,http://localhost:3004',
      },
      error_file: './logs/ai-wrapper-error.log',
      out_file: './logs/ai-wrapper-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },

    // Health monitor for AI services
    {
      name: 'ai-health-monitor',
      script: 'node',
      args: '-e "setInterval(async () => { try { const res = await fetch(\'http://localhost:3200/ai/providers\'); const data = await res.json(); console.log(new Date().toISOString(), \'AI Providers:\', data.available.join(\', \')); } catch (e) { console.error(new Date().toISOString(), \'Health check failed:\', e.message); } }, 60000)"',
      instances: 1,
      autorestart: true,
      cron_restart: '0 */6 * * *', // Restart every 6 hours
      max_memory_restart: '100M',
      error_file: './logs/ai-health-error.log',
      out_file: './logs/ai-health-out.log',
    }
  ],

  /**
   * Deployment configuration for production
   */
  deploy: {
    production: {
      user: 'deployer',
      host: ['production-server'],
      ref: 'origin/main',
      repo: 'git@github.com:your-org/orion.git',
      path: '/var/www/orion',
      'post-deploy': 'pnpm install && pnpm nx build ai-wrapper && pm2 reload ecosystem.ai-services.config.js',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
