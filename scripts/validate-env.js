#!/usr/bin/env node

/**
 * Environment Validation Script
 * Validates required environment variables before starting the app.
 * This script will fail hard if EXPO_PUBLIC_API_URL is not set.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating environment configuration...\n');

// Load .env file if it exists
const envPath = path.join(process.cwd(), '.env');
let envVars = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

// Merge with process.env (process.env takes precedence)
const allEnvVars = { ...envVars, ...process.env };

// Check for empty variables (API URL defaults to Railway, so we only check if it's explicitly set but empty)
const empty = [];

// Check if EXPO_PUBLIC_API_URL is explicitly set but empty
if (allEnvVars.hasOwnProperty('EXPO_PUBLIC_API_URL') && allEnvVars['EXPO_PUBLIC_API_URL'] && allEnvVars['EXPO_PUBLIC_API_URL'].trim() === '') {
  empty.push('EXPO_PUBLIC_API_URL');
}

if (empty.length > 0) {
  console.error('❌ Empty environment variables:');
  empty.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n💡 These variables are set but have no value.');
  console.error('   Remove them from .env to use the default (Railway production), or provide a valid value.\n');
  process.exit(1);
}

// Validate API URL format (if set, otherwise will use Railway default)
const apiUrl = allEnvVars['EXPO_PUBLIC_API_URL'];
if (apiUrl) {
  try {
    new URL(apiUrl);
    console.log(`✅ EXPO_PUBLIC_API_URL is set: ${apiUrl}`);
  } catch (error) {
    console.error(`❌ EXPO_PUBLIC_API_URL is not a valid URL: ${apiUrl}`);
    console.error('\n💡 Please provide a valid URL (e.g., https://snacktrackapi-production.up.railway.app)\n');
    process.exit(1);
  }
} else {
  console.log('ℹ️  EXPO_PUBLIC_API_URL not set (will use Railway production default: https://snacktrackapi-production.up.railway.app)');
}

// Check optional APP_ENV
const appEnv = allEnvVars['EXPO_PUBLIC_APP_ENV'];
if (appEnv) {
  const validEnvs = ['development', 'staging', 'production'];
  if (validEnvs.includes(appEnv)) {
    console.log(`✅ EXPO_PUBLIC_APP_ENV is set: ${appEnv}`);
  } else {
    console.error(`❌ EXPO_PUBLIC_APP_ENV has invalid value: ${appEnv}`);
    console.error(`   Valid values: ${validEnvs.join(', ')}\n`);
    process.exit(1);
  }
} else {
  console.log('ℹ️  EXPO_PUBLIC_APP_ENV not set (will default to "development")');
}

console.log('\n✅ Environment configuration is valid!\n');
process.exit(0);

