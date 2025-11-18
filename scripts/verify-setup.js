#!/usr/bin/env node

/**
 * Setup Verification Script
 * Checks if the development environment is properly configured
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Snack Track App Setup...\n');

const checks = [
  {
    name: 'Node.js Version',
    check: () => {
      const version = process.version;
      const majorVersion = parseInt(version.slice(1).split('.')[0]);
      if (majorVersion >= 18) {
        console.log(`✅ Node.js ${version} (required: 18+)`);
        return true;
      } else {
        console.log(`❌ Node.js ${version} (required: 18+)`);
        return false;
      }
    }
  },
  {
    name: 'Docker Installation',
    check: () => {
      try {
        const version = execSync('docker --version', { encoding: 'utf8' }).trim();
        console.log(`✅ ${version}`);
        return true;
      } catch (error) {
        console.log('❌ Docker not found. Please install Docker Desktop.');
        return false;
      }
    }
  },
  {
    name: 'Docker Compose',
    check: () => {
      try {
        const version = execSync('docker-compose --version', { encoding: 'utf8' }).trim();
        console.log(`✅ ${version}`);
        return true;
      } catch (error) {
        console.log('❌ Docker Compose not found.');
        return false;
      }
    }
  },
  {
    name: 'Environment File',
    check: () => {
      if (fs.existsSync('.env')) {
        console.log('✅ .env file exists');
        return true;
      } else {
        console.log('❌ .env file missing. Run: cp .env.development .env');
        return false;
      }
    }
  },
  {
    name: 'Environment Variables',
    check: () => {
      try {
        // Load .env file if it exists
        if (fs.existsSync('.env')) {
          const envContent = fs.readFileSync('.env', 'utf8');
          const envLines = envContent.split('\n');
          const envVars = {};
          
          envLines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
              const [key, ...valueParts] = trimmed.split('=');
              if (key && valueParts.length > 0) {
                envVars[key.trim()] = valueParts.join('=').trim();
              }
            }
          });
          
          // Check for empty variables (API URL has default, so only check if explicitly set but empty)
          const empty = [];
          
          // Check if EXPO_PUBLIC_API_URL is explicitly set but empty
          const apiUrlValue = envVars['EXPO_PUBLIC_API_URL'] || process.env['EXPO_PUBLIC_API_URL'];
          if (apiUrlValue && apiUrlValue.trim() === '') {
            empty.push('EXPO_PUBLIC_API_URL');
          }
          
          if (empty.length > 0) {
            console.log(`❌ Empty environment variables: ${empty.join(', ')}`);
            console.log('   These variables are set but have no value.');
            console.log('   Remove them from .env to use the default (Railway production), or provide a valid value.');
            return false;
          }
          
          // Validate API URL format (if set, otherwise will use Railway default)
          const apiUrl = envVars['EXPO_PUBLIC_API_URL'] || process.env['EXPO_PUBLIC_API_URL'];
          if (apiUrl) {
            try {
              new URL(apiUrl);
              console.log(`✅ EXPO_PUBLIC_API_URL is set: ${apiUrl}`);
            } catch (error) {
              console.log(`❌ EXPO_PUBLIC_API_URL is not a valid URL: ${apiUrl}`);
              return false;
            }
          } else {
            console.log('ℹ️  EXPO_PUBLIC_API_URL not set (will use Railway production default: https://snacktrackapi-production.up.railway.app)');
          }
          
          // Check optional APP_ENV
          const appEnv = envVars['EXPO_PUBLIC_APP_ENV'] || process.env['EXPO_PUBLIC_APP_ENV'];
          if (appEnv) {
            const validEnvs = ['development', 'staging', 'production'];
            if (validEnvs.includes(appEnv)) {
              console.log(`✅ EXPO_PUBLIC_APP_ENV is set: ${appEnv}`);
            } else {
              console.log(`⚠️  EXPO_PUBLIC_APP_ENV has invalid value: ${appEnv}`);
              console.log(`   Valid values: ${validEnvs.join(', ')}`);
            }
          } else {
            console.log('ℹ️  EXPO_PUBLIC_APP_ENV not set (will default to "development")');
          }
          
          return true;
        } else {
          console.log('⚠️  .env file not found, cannot validate environment variables');
          console.log('   Create a .env file with: EXPO_PUBLIC_API_URL=https://snacktrackapi-production.up.railway.app');
          console.log('   (Or leave unset to use Railway production as default)');
          return false;
        }
      } catch (error) {
        console.log(`❌ Error validating environment variables: ${error.message}`);
        return false;
      }
    }
  },
  {
    name: 'Dependencies',
    check: () => {
      if (fs.existsSync('node_modules')) {
        console.log('✅ node_modules directory exists');
        return true;
      } else {
        console.log('❌ Dependencies not installed. Run: npm install');
        return false;
      }
    }
  },
  {
    name: 'Database Containers',
    check: () => {
      try {
        const output = execSync('docker ps --format "table {{.Names}}\t{{.Status}}"', { encoding: 'utf8' });
        const hasPostgres = output.includes('snacktrack-postgres-dev');
        const hasRedis = output.includes('snacktrack-redis-dev');
        
        if (hasPostgres && hasRedis) {
          console.log('✅ Database containers are running');
          return true;
        } else {
          console.log('❌ Database containers not running. Run: npm run db:start');
          return false;
        }
      } catch (error) {
        console.log('❌ Could not check database containers');
        return false;
      }
    }
  },
  {
    name: 'Snack Track API',
    check: async () => {
      try {
        const response = await fetch('http://localhost:3000/');
        if (response.ok) {
          console.log('✅ Snack Track API is responding (real data available)');
          return true;
        } else {
          console.log('❌ Snack Track API not responding properly');
          return false;
        }
      } catch (error) {
        console.log('⚠️  Snack Track API not accessible - app will use mock data');
        console.log('   To get real data: cd path/to/SnackTrackAPI && docker-compose up -d');
        return false;
      }
    }
  }
];

async function runChecks() {
  let allPassed = true;
  
  for (const check of checks) {
    try {
      const result = await check.check();
      if (!result) {
        allPassed = false;
      }
    } catch (error) {
      console.log(`❌ ${check.name}: ${error.message}`);
      allPassed = false;
    }
    console.log('');
  }
  
  console.log('📋 Setup Verification Summary:');
  console.log('================================');
  
  if (allPassed) {
    console.log('🎉 All checks passed! Your environment is ready.');
    console.log('\nNext steps:');
    console.log('1. Run: npm start');
    console.log('2. Press "w" to open in browser');
    console.log('3. Start coding! 🚀');
  } else {
    console.log('⚠️  Some checks failed. Please fix the issues above.');
    console.log('\nQuick fixes:');
    console.log('- Run: npm run setup');
    console.log('- For real data: cd ~/Projects/snack-track && docker-compose up -d');
    console.log('- Check README.md for detailed instructions');
  }
  
  console.log('\n📚 Documentation:');
  console.log('- README.md - Complete project documentation');
  console.log('- All setup instructions are in the main README');
}

// Add fetch polyfill for Node.js
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

runChecks().catch(console.error);
