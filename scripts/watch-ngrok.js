#!/usr/bin/env node

/**
 * Ngrok URL Watcher
 * Automatically syncs ngrok URL to Vercel when it changes
 */

const http = require('http');

const NGROK_API = 'http://127.0.0.1:4040/api/tunnels';
const SYNC_API = 'http://localhost:1998/api/ollama/ngrok/sync';
const CHECK_INTERVAL = 30000; // Check every 30 seconds

let lastNgrokUrl = null;
let isInitialSync = true;

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };

    const req = http.request(url, options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function getNgrokUrl() {
  try {
    const data = await fetchJson(NGROK_API);
    if (!data.tunnels || !Array.isArray(data.tunnels)) return null;

    const tunnel = data.tunnels.find(t =>
      t.public_url &&
      t.public_url.startsWith('https') &&
      (t.config?.addr?.includes('11434') || t.config?.addr === '11434')
    );

    return tunnel?.public_url || null;
  } catch (err) {
    return null;
  }
}

async function syncToVercel(ngrokUrl) {
  try {
    console.log(`🔄 Syncing ngrok URL to Vercel: ${ngrokUrl}`);
    const response = await postJson(SYNC_API, { targets: ['production', 'preview'] });

    if (response.ok) {
      console.log(`✅ Successfully synced to Vercel!`);
      console.log(`🚀 New deployment: ${response.url || 'N/A'}`);
      return true;
    } else {
      console.error(`❌ Sync failed: ${response.error || 'Unknown error'}`);
      return false;
    }
  } catch (err) {
    console.error(`❌ Failed to sync: ${err.message}`);
    return false;
  }
}

async function checkAndSync() {
  const currentNgrokUrl = await getNgrokUrl();

  if (!currentNgrokUrl) {
    if (lastNgrokUrl) {
      console.log('⚠️  Ngrok tunnel not found (was it restarted?)');
      lastNgrokUrl = null;
    }
    return;
  }

  if (currentNgrokUrl !== lastNgrokUrl) {
    if (isInitialSync) {
      console.log(`🌐 Detected ngrok tunnel: ${currentNgrokUrl}`);
      isInitialSync = false;
    } else {
      console.log(`🔄 Ngrok URL changed from ${lastNgrokUrl} to ${currentNgrokUrl}`);
    }

    lastNgrokUrl = currentNgrokUrl;
    await syncToVercel(currentNgrokUrl);
  }
}

async function main() {
  console.log('👀 Watching for ngrok URL changes...');
  console.log(`   Checking every ${CHECK_INTERVAL / 1000} seconds`);
  console.log('   Press Ctrl+C to stop\n');

  // Initial check
  await checkAndSync();

  // Periodic checks
  setInterval(checkAndSync, CHECK_INTERVAL);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopping ngrok watcher...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Stopping ngrok watcher...');
  process.exit(0);
});

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
