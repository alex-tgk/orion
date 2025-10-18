#!/usr/bin/env node

/**
 * Script to generate secure secrets for ORION platform
 * Usage: npm run generate-secrets
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Generate a secure random secret
 */
function generateSecret(length = 48) {
  return crypto.randomBytes(length).toString('base64');
}

/**
 * Generate a complex password
 */
function generateComplexPassword(length = 24) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const all = uppercase + lowercase + numbers + special;

  let password = '';

  // Ensure at least one character from each category
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += special[crypto.randomInt(special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += all[crypto.randomInt(all.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => crypto.randomInt(3) - 1).join('');
}

/**
 * Check if .env file exists
 */
function checkEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  return fs.existsSync(envPath);
}

/**
 * Read existing .env file
 */
function readEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};

  content.split('\n').forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return env;
}

/**
 * Write .env file
 */
function writeEnvFile(env) {
  const envPath = path.join(process.cwd(), '.env');
  const templatePath = path.join(process.cwd(), '.env.template');

  if (!fs.existsSync(templatePath)) {
    console.error(`${colors.red}Error: .env.template file not found!${colors.reset}`);
    process.exit(1);
  }

  const template = fs.readFileSync(templatePath, 'utf-8');
  let output = template;

  // Replace placeholders with actual values
  Object.keys(env).forEach(key => {
    const regex = new RegExp(`^${key}=.*$`, 'gm');
    output = output.replace(regex, `${key}=${env[key]}`);
  });

  // Backup existing .env file if it exists
  if (fs.existsSync(envPath)) {
    const backupPath = `${envPath}.backup.${Date.now()}`;
    fs.copyFileSync(envPath, backupPath);
    console.log(`${colors.cyan}Backed up existing .env to: ${backupPath}${colors.reset}`);
  }

  fs.writeFileSync(envPath, output);
  console.log(`${colors.green}✓ .env file generated successfully!${colors.reset}`);
}

/**
 * Generate all required secrets
 */
function generateAllSecrets() {
  const secrets = {
    // JWT Secrets
    JWT_SECRET: generateSecret(64),
    JWT_REFRESH_SECRET: generateSecret(64),

    // Encryption Keys
    MASTER_ENCRYPTION_KEY: generateSecret(64),
    DATABASE_ENCRYPTION_KEY: generateSecret(48),
    SESSION_SECRET: generateSecret(48),

    // Database Credentials
    DB_USER: 'orion_user',
    DB_PASSWORD: generateComplexPassword(24),

    // Redis Password
    REDIS_PASSWORD: generateComplexPassword(24),

    // SMTP Password (placeholder)
    SMTP_USER: 'your-email@gmail.com',
    SMTP_PASSWORD: 'generate-app-specific-password',
  };

  return secrets;
}

/**
 * Display generated secrets
 */
function displaySecrets(secrets) {
  console.log(`\n${colors.bright}${colors.green}Generated Secure Secrets:${colors.reset}\n`);

  console.log(`${colors.cyan}JWT & Authentication:${colors.reset}`);
  console.log(`  JWT_SECRET: ${colors.yellow}${secrets.JWT_SECRET}${colors.reset}`);
  console.log(`  JWT_REFRESH_SECRET: ${colors.yellow}${secrets.JWT_REFRESH_SECRET}${colors.reset}`);

  console.log(`\n${colors.cyan}Encryption Keys:${colors.reset}`);
  console.log(`  MASTER_ENCRYPTION_KEY: ${colors.yellow}${secrets.MASTER_ENCRYPTION_KEY}${colors.reset}`);
  console.log(`  DATABASE_ENCRYPTION_KEY: ${colors.yellow}${secrets.DATABASE_ENCRYPTION_KEY}${colors.reset}`);
  console.log(`  SESSION_SECRET: ${colors.yellow}${secrets.SESSION_SECRET}${colors.reset}`);

  console.log(`\n${colors.cyan}Database:${colors.reset}`);
  console.log(`  DB_USER: ${colors.yellow}${secrets.DB_USER}${colors.reset}`);
  console.log(`  DB_PASSWORD: ${colors.yellow}${secrets.DB_PASSWORD}${colors.reset}`);

  console.log(`\n${colors.cyan}Redis:${colors.reset}`);
  console.log(`  REDIS_PASSWORD: ${colors.yellow}${secrets.REDIS_PASSWORD}${colors.reset}`);
}

/**
 * Main function
 */
async function main() {
  console.log(`${colors.bright}${colors.blue}╔════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║     ORION Platform - Secure Secrets Generator     ║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════════════╝${colors.reset}\n`);

  const envExists = checkEnvFile();

  if (envExists) {
    console.log(`${colors.yellow}⚠ Warning: .env file already exists!${colors.reset}`);

    const answer = await new Promise(resolve => {
      rl.question(`${colors.cyan}Do you want to regenerate all secrets? (yes/no): ${colors.reset}`, resolve);
    });

    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
      console.log(`${colors.red}Operation cancelled.${colors.reset}`);
      rl.close();
      return;
    }
  }

  console.log(`\n${colors.cyan}Generating secure secrets...${colors.reset}`);

  const secrets = generateAllSecrets();
  const existingEnv = readEnvFile();
  const finalEnv = { ...existingEnv, ...secrets };

  displaySecrets(secrets);

  const answer = await new Promise(resolve => {
    rl.question(`\n${colors.cyan}Do you want to save these secrets to .env? (yes/no): ${colors.reset}`, resolve);
  });

  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    writeEnvFile(finalEnv);

    console.log(`\n${colors.bright}${colors.green}✓ Setup complete!${colors.reset}`);
    console.log(`\n${colors.yellow}Important Security Reminders:${colors.reset}`);
    console.log('  1. Add .env to .gitignore (if not already added)');
    console.log('  2. Never commit .env to version control');
    console.log('  3. Store production secrets in a secure vault (AWS Secrets Manager, HashiCorp Vault, etc.)');
    console.log('  4. Update SMTP_USER and SMTP_PASSWORD with your email credentials');
    console.log('  5. Update database credentials for your PostgreSQL instance');
    console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
    console.log('  1. Review and update .env file with your specific settings');
    console.log('  2. Set up your database: npm run db:setup');
    console.log('  3. Run migrations: npm run db:migrate');
    console.log('  4. Start the services: npm run dev');
  } else {
    console.log(`\n${colors.yellow}Secrets were generated but not saved.${colors.reset}`);
    console.log('You can manually copy them to your .env file.');
  }

  rl.close();
}

// Run the script
main().catch(error => {
  console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
});