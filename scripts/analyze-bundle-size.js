#!/usr/bin/env node

/**
 * Bundle Size Analysis Script
 * Analyzes bundle size for iOS and Android platforms
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUNDLE_BUDGET = {
  ios: {
    js: 2 * 1024 * 1024, // 2MB
    total: 5 * 1024 * 1024, // 5MB
  },
  android: {
    js: 2 * 1024 * 1024, // 2MB
    total: 5 * 1024 * 1024, // 5MB
  },
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

function analyzeBundleSize(platform) {
  console.log(`\n📦 Analyzing ${platform.toUpperCase()} bundle size...\n`);

  const distPath = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(distPath)) {
    console.log(`⚠️  dist/ directory not found. Running expo export...`);
    try {
      execSync(`npx expo export --platform ${platform}`, { stdio: 'inherit' });
    } catch (error) {
      console.error(`❌ Failed to export ${platform} bundle`);
      return null;
    }
  }

  const platformPath = path.join(distPath, platform);
  if (!fs.existsSync(platformPath)) {
    console.error(`❌ ${platform} bundle not found at ${platformPath}`);
    return null;
  }

  // Find all JS bundles
  const jsFiles = [];
  function findJsFiles(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        findJsFiles(filePath);
      } else if (file.endsWith('.js') || file.endsWith('.jsbundle')) {
        jsFiles.push(filePath);
      }
    });
  }

  findJsFiles(platformPath);

  let totalJsSize = 0;
  const fileSizes = [];

  jsFiles.forEach(file => {
    const size = getFileSize(file);
    totalJsSize += size;
    const relativePath = path.relative(process.cwd(), file);
    fileSizes.push({ path: relativePath, size });
  });

  // Calculate total bundle size (including assets)
  let totalSize = totalJsSize;
  function calculateDirSize(dir) {
    let size = 0;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        size += calculateDirSize(filePath);
      } else {
        size += stat.size;
      }
    });
    return size;
  }

  totalSize = calculateDirSize(platformPath);

  const budget = BUNDLE_BUDGET[platform];
  const jsOverBudget = totalJsSize > budget.js;
  const totalOverBudget = totalSize > budget.total;

  console.log(`📊 ${platform.toUpperCase()} Bundle Analysis:`);
  console.log(`   JS Bundle: ${formatBytes(totalJsSize)} ${jsOverBudget ? '⚠️  OVER BUDGET' : '✅'}`);
  console.log(`   Total Size: ${formatBytes(totalSize)} ${totalOverBudget ? '⚠️  OVER BUDGET' : '✅'}`);
  console.log(`   Budget: JS ${formatBytes(budget.js)}, Total ${formatBytes(budget.total)}`);

  if (fileSizes.length > 0) {
    console.log(`\n   Top 5 largest JS files:`);
    fileSizes
      .sort((a, b) => b.size - a.size)
      .slice(0, 5)
      .forEach(({ path: filePath, size }) => {
        console.log(`     ${formatBytes(size).padEnd(10)} ${filePath}`);
      });
  }

  return {
    platform,
    jsSize: totalJsSize,
    totalSize,
    jsOverBudget,
    totalOverBudget,
    fileSizes: fileSizes.sort((a, b) => b.size - a.size),
  };
}

function main() {
  console.log('🚀 Bundle Size Analysis\n');
  console.log('='.repeat(50));

  const platforms = ['ios', 'android'];
  const results = [];

  platforms.forEach(platform => {
    const result = analyzeBundleSize(platform);
    if (result) {
      results.push(result);
    }
  });

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📋 Summary\n');

  let hasIssues = false;
  results.forEach(result => {
    const status = (result.jsOverBudget || result.totalOverBudget) ? '❌' : '✅';
    console.log(`${status} ${result.platform.toUpperCase()}:`);
    console.log(`   JS: ${formatBytes(result.jsSize)} / ${formatBytes(BUNDLE_BUDGET[result.platform].js)}`);
    console.log(`   Total: ${formatBytes(result.totalSize)} / ${formatBytes(BUNDLE_BUDGET[result.platform].total)}`);
    
    if (result.jsOverBudget || result.totalOverBudget) {
      hasIssues = true;
    }
  });

  // Save results to file
  const resultsPath = path.join(process.cwd(), 'bundle-size-report.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Detailed report saved to: bundle-size-report.json`);

  if (hasIssues) {
    console.log('\n⚠️  Bundle size exceeds budget! Review the report and optimize.');
    process.exit(1);
  } else {
    console.log('\n✅ All bundle sizes are within budget!');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = { analyzeBundleSize, BUNDLE_BUDGET };


