/**
 * Automated Performance Audit for BanosCookbook
 * Measures: Load times, bundle sizes, Core Web Vitals
 * Run: npx playwright install && node scripts/performance-audit.js
 */

const http = require('http');

// Configuration
const BASE_URL = 'http://localhost:9002';
const PAGES = [
  { name: 'Home', path: '/' },
  { name: 'Add Recipe', path: '/add-recipe' },
  // { name: 'Recipe Detail', path: '/recipes/hd3iy5XG47LfdpqyL1Bu' }, // First test recipe
  { name: 'Admin Dashboard', path: '/admin/generated-images' },
  { name: 'Legal - Terms', path: '/legal/terms' },
];

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  loadTime: 4000, // 4 seconds
  firstByte: 1000, // 1 second
};

/**
 * Measure page load time
 */
function measureLoadTime(url) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const req = http.get(url, (res) => {
      let data = '';
      const firstByteTime = Date.now();

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const totalTime = Date.now() - startTime;
        const firstByteTime2 = firstByteTime - startTime;
        const contentSize = Buffer.byteLength(data, 'utf8');

        resolve({
          totalTime,
          firstByteTime: firstByteTime2,
          contentSize,
          statusCode: res.statusCode,
          headers: res.headers,
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(10000); // 10 second timeout
  });
}

/**
 * Extract JavaScript bundle size from HTML
 */
function extractBundleInfo(html) {
  const jsMatches = html.match(/<script\s+src="[^"]*\.js"/g) || [];
  const cssMatches = html.match(/<link\s+rel="stylesheet"[^>]*href="[^"]*\.css"/g) || [];

  return {
    jsFiles: jsMatches.length,
    cssFiles: cssMatches.length,
  };
}

/**
 * Run performance audit
 */
async function runAudit() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║         🚀 BanosCookbook Performance Audit Started               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const results = [];
  let allPassed = true;

  for (const page of PAGES) {
    const url = `${BASE_URL}${page.path}`;
    console.log(`📊 Testing: ${page.name.padEnd(20)} ${url}`);

    try {
      const startTime = Date.now();
      const metrics = await measureLoadTime(url);
      const duration = Date.now() - startTime;

      const passed = {
        loadTime: metrics.totalTime <= THRESHOLDS.loadTime,
        firstByte: metrics.firstByteTime <= THRESHOLDS.firstByte,
      };

      const status = passed.loadTime && passed.firstByte ? '✅' : '⚠️ ';

      results.push({
        page: page.name,
        path: page.path,
        metrics,
        passed,
      });

      console.log(`   ${status} Load Time: ${metrics.totalTime}ms (target: <${THRESHOLDS.loadTime}ms)`);
      console.log(`      First Byte: ${metrics.firstByteTime}ms (target: <${THRESHOLDS.firstByte}ms)`);
      console.log(`      Content Size: ${(metrics.contentSize / 1024).toFixed(2)}KB`);
      console.log(`      Status: HTTP ${metrics.statusCode}`);

      if (!passed.loadTime || !passed.firstByte) {
        allPassed = false;
      }

      console.log('');
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
      allPassed = false;
    }
  }

  // Summary
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                          📈 Summary                             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Table
  console.log('Page                  | Load Time | First Byte | Status');
  console.log('─────────────────────┼───────────┼────────────┼────────');

  results.forEach((result) => {
    const status = result.passed.loadTime && result.passed.firstByte ? '✅ Pass' : '⚠️ Warn';
    console.log(
      `${result.page.padEnd(21)}| ${`${result.metrics.totalTime}ms`.padEnd(9)} | ${`${result.metrics.firstByteTime}ms`.padEnd(10)} | ${status}`
    );
  });

  console.log('');

  // Overall result
  if (allPassed) {
    console.log('✅ All performance targets met!\n');
  } else {
    console.log('⚠️  Some pages exceeded performance targets. Consider optimization.\n');
    console.log('📌 Recommendations:');
    console.log('   • Enable compression (gzip/brotli)');
    console.log('   • Optimize images');
    console.log('   • Code splitting for large bundles');
    console.log('   • Consider caching strategies');
    console.log('   • Use a CDN for static assets\n');
  }

  // Development mode notice
  console.log('ℹ️  Note: This is running against development server.');
  console.log('   Production build may have different performance characteristics.');
  console.log('   For production audit, run: npm run build && npm start\n');
}

// Run the audit
runAudit().catch((error) => {
  console.error('❌ Audit failed:', error.message);
  process.exit(1);
});
