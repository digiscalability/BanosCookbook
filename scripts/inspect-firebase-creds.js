#!/usr/bin/env node
/**
 * Inspect Firebase-related env vars and credential file presence.
 * Prints only presence, lengths, and masked snippets (no full secrets).
 */
const fs = require('fs');
function mask(s, show=6){
  if (!s) return '';
  const len = s.length;
  if (len <= show*2) return s.replace(/./g,'*');
  return s.slice(0, show) + '...' + s.slice(-show);
}

function statPath(p){
  try{
    const st = fs.statSync(p);
    return {exists:true,size:st.size,mode:st.mode};
  }catch(e){
    return {exists:false};
  }
}

console.log('cwd:', process.cwd());

const keys = [
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PROJECT_ID',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GOOGLE_APPLICATION_CREDENTIALS_JSON'
];

keys.forEach(k=>{
  const v = process.env[k];
  if (v === undefined) {
    console.log(k, '= <not set>');
  } else if (v === ''){
    console.log(k, '= <empty string>');
  } else {
    if (k === 'FIREBASE_SERVICE_ACCOUNT_JSON'){
      // try parse
      let ok=false;
      try{ JSON.parse(v); ok=true;}catch(e){}
      console.log(k, `= set, length=${v.length}, jsonParse=${ok}, preview=${mask(v)}`);
    } else if (k === 'FIREBASE_PRIVATE_KEY'){
      console.log(k, `= set, length=${v.length}, preview=${mask(v,8).replace(/\\n/g,'\\n')}`);
    } else if (k === 'GOOGLE_APPLICATION_CREDENTIALS'){
      const stat = statPath(v);
      console.log(k, `= set, value=${v}`, stat.exists ? `(file exists, size=${stat.size})` : '(file missing)');
    } else {
      console.log(k, `= set, length=${v.length}, preview=${mask(v)}`);
    }
  }
});

// Also check process user & node version
console.log('node:', process.version);
console.log('platform:', process.platform);
console.log('uid/gid (if available):', process.getuid ? process.getuid() : '<n/a>', process.getgid ? process.getgid() : '<n/a>');

// Try to load GOOGLE_APPLICATION_CREDENTIALS file if present
const ga = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (ga){
  try{
    const content = fs.readFileSync(ga,'utf8');
    console.log('GA file read ok, length=', content.length);
  }catch(e){
    console.log('GA file read error:', e.message);
  }
}

// Exit non-zero if no obvious credential source
if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.FIREBASE_PRIVATE_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS){
  console.log('\nNo service account envs detected. Please set either FIREBASE_SERVICE_ACCOUNT_JSON, or FIREBASE_PRIVATE_KEY+FIREBASE_CLIENT_EMAIL+FIREBASE_PROJECT_ID, or GOOGLE_APPLICATION_CREDENTIALS path.');
  process.exit(1);
}

console.log('\nDone.');
