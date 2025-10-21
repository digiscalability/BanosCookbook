// Usage:
//   node scripts/verify-webhook-signature.js payload.json "sha256=..."
//
// This will test both FACEBOOK_APP_SECRET and INSTAGRAM_APP_SECRET from your .env file.

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

if (process.argv.length < 4) {
  console.error('Usage: node scripts/verify-webhook-signature.js <payload.json> <signatureHeader>');
  process.exit(1);
}

const payloadFile = process.argv[2];
const signatureHeader = process.argv[3];

const payload = fs.readFileSync(payloadFile);

// Load .env file from project root
function loadEnvVars(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) {
      let val = m[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      env[m[1]] = val;
    }
  }
  return env;
}

const envPath = path.resolve(__dirname, '../.env');
const env = loadEnvVars(envPath);
const secrets = [
  { name: 'FACEBOOK_APP_SECRET', value: env.FACEBOOK_APP_SECRET },
  { name: 'INSTAGRAM_APP_SECRET', value: env.INSTAGRAM_APP_SECRET },
];

const [algo, sigHex] = signatureHeader.split('=');
if (!algo || !sigHex) {
  console.error('Invalid signature header format. Expected sha256=<hex> or sha1=<hex>');
  process.exit(1);
}

const hmacAlgo = algo.toLowerCase() === 'sha256' ? 'sha256' : 'sha1';

console.log('Signature header:', signatureHeader);
let found = false;
for (const { name, value } of secrets) {
  if (!value) {
    console.log(`Skipping ${name} (not set in .env)`);
    continue;
  }
  const expectedHex = crypto.createHmac(hmacAlgo, value).update(payload).digest('hex');
  const match = sigHex === expectedHex;
  console.log(`\nTesting ${name}:`);
  console.log('Computed:', algo + '=' + expectedHex);
  if (match) {
    console.log(`✅ ${name} is valid for this signature!`);
    found = true;
  } else {
    console.log(`❌ ${name} is NOT valid for this signature.`);
  }
}
if (!found) {
  console.log('\nNo secret matched the signature.');
}
