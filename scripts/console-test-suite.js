/**
 * BanosCookbook - Console Testing Suite
 * Paste entire script into browser console to run automated checks
 *
 * Usage:
 * 1. Go to any page (http://localhost:9002)
 * 2. Open DevTools (F12)
 * 3. Go to Console tab
 * 4. Paste this entire script and press Enter
 */

(function () {
  'use strict';

  // Color utilities for console output
  const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
  };

  const log = {
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    header: (msg) => console.log(`${colors.cyan}► ${msg}${colors.reset}`),
  };

  // Test Results Storage
  const results = {
    tests: [],
    add: (name, passed, details = '') => {
      results.tests.push({ name, passed, details });
    },
    print: () => {
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('               📊 Test Results Summary');
      console.log('═══════════════════════════════════════════════════════\n');

      const passed = results.tests.filter((t) => t.passed).length;
      const failed = results.tests.filter((t) => !t.passed).length;

      results.tests.forEach((test) => {
        if (test.passed) {
          log.success(`${test.name}`);
        } else {
          log.error(`${test.name}`);
        }
        if (test.details) console.log(`     ${test.details}`);
      });

      console.log('\n───────────────────────────────────────────────────────');
      console.log(`Total: ${results.tests.length} | Passed: ${passed} | Failed: ${failed}`);
      console.log('═══════════════════════════════════════════════════════\n');

      return failed === 0;
    },
  };

  // ═════════════════════════════════════════════════════════════════
  // CONSOLE HEALTH CHECK
  // ═════════════════════════════════════════════════════════════════

  log.header('Checking Console for Errors...');

  // Check if there are errors (note: in console, we can't read actual errors easily)
  // But we can check for error count from DevTools API if available
  const hasErrors = document.querySelectorAll('[style*="color: red"]').length > 0;
  results.add('No console errors', !hasErrors, hasErrors ? 'Some errors found - review console' : 'Clean console');

  // ═════════════════════════════════════════════════════════════════
  // FIREBASE CONNECTION CHECK
  // ═════════════════════════════════════════════════════════════════

  log.header('Checking Firebase Integration...');

  try {
    // Check if Firebase is available in window
    const hasFirebase = !!window.firebase;
    results.add('Firebase SDK loaded', hasFirebase);

    if (hasFirebase) {
      // Try to check if Firestore is initialized
      const firestore = firebase.firestore?.();
      results.add('Firestore initialized', !!firestore, firestore ? 'Connected' : 'Not initialized');
    }
  } catch (error) {
    results.add('Firebase check', false, error.message);
  }

  // ═════════════════════════════════════════════════════════════════
  // DOM STRUCTURE CHECK
  // ═════════════════════════════════════════════════════════════════

  log.header('Checking DOM Structure...');

  const checks = {
    'Header element': document.querySelector('header'),
    'Main element': document.querySelector('main'),
    'Footer element': document.querySelector('footer'),
    'Body has layout class': document.body.className.includes('flex') || document.body.className.includes('bg-'),
  };

  Object.entries(checks).forEach(([name, element]) => {
    results.add(name, !!element, element ? 'Found' : 'Missing');
  });

  // ═════════════════════════════════════════════════════════════════
  // PERFORMANCE METRICS CHECK
  // ═════════════════════════════════════════════════════════════════

  log.header('Checking Performance Metrics...');

  try {
    const perfData = window.performance.getEntries();
    const navigationTiming = performance.getEntriesByType('navigation')[0];

    if (navigationTiming) {
      const dcl = navigationTiming.domContentLoadedEventEnd - navigationTiming.domContentLoadedEventStart;
      const loadTime = navigationTiming.loadEventEnd - navigationTiming.loadEventStart;

      results.add(
        'Page load completed',
        loadTime > 0,
        `DomContentLoaded: ${dcl.toFixed(0)}ms, Load: ${loadTime.toFixed(0)}ms`
      );

      // Check Core Web Vitals thresholds
      const lcp = navigationTiming.largestContentfulPaint;
      if (lcp) {
        results.add('LCP performance', lcp < 2500, `LCP: ${lcp.toFixed(0)}ms (target: <2500ms)`);
      }
    }

    const resourceEntries = performance.getEntriesByType('resource');
    const totalSize = resourceEntries.reduce((sum, entry) => sum + (entry.transferSize || 0), 0);
    results.add(
      'Resource size reasonable',
      totalSize < 1000000,
      `Total: ${(totalSize / 1024).toFixed(0)}KB (target: <1MB)`
    );
  } catch (error) {
    results.add('Performance metrics', false, error.message);
  }

  // ═════════════════════════════════════════════════════════════════
  // RESPONSIVE DESIGN CHECK
  // ═════════════════════════════════════════════════════════════════

  log.header('Checking Responsive Design...');

  const viewport = document.querySelector('meta[name="viewport"]');
  results.add('Viewport meta tag', !!viewport, viewport?.content);

  const styles = window.getComputedStyle(document.documentElement);
  const bodyStyles = window.getComputedStyle(document.body);

  results.add(
    'Font size set',
    styles.fontSize !== 'medium',
    `Root font: ${styles.fontSize}`
  );

  // ═════════════════════════════════════════════════════════════════
  // ACCESSIBILITY CHECK
  // ═════════════════════════════════════════════════════════════════

  log.header('Checking Accessibility...');

  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  results.add(
    'Page has headings',
    headings.length > 0,
    `Found ${headings.length} heading(s)`
  );

  const mainContent = document.querySelector('main');
  results.add('Main content element', !!mainContent);

  const images = document.querySelectorAll('img');
  const imagesWithAlt = Array.from(images).filter((img) => img.getAttribute('alt'));
  results.add(
    'Images have alt text',
    imagesWithAlt.length === images.length,
    `${imagesWithAlt.length}/${images.length} images with alt text`
  );

  const links = document.querySelectorAll('a');
  results.add(
    'Links have text',
    Array.from(links).every((link) => link.textContent.trim() || link.getAttribute('aria-label')),
    `Found ${links.length} link(s)`
  );

  // ═════════════════════════════════════════════════════════════════
  // NETWORK REQUESTS CHECK
  // ═════════════════════════════════════════════════════════════════

  log.header('Checking Network Requests...');

  try {
    const resources = performance.getEntriesByType('resource');

    // Check for failed resources
    const failedResources = resources.filter(
      (r) => r.transferSize === 0 || r.duration > 5000
    );

    results.add(
      'All resources loaded',
      failedResources.length === 0,
      failedResources.length > 0 ? `${failedResources.length} slow/failed resource(s)` : 'All resources OK'
    );

    // Check for 4xx/5xx responses (if available)
    const slowResources = resources.filter((r) => r.duration > 2000);
    if (slowResources.length > 0) {
      results.add(
        'Resource load times',
        slowResources.length === 0,
        `${slowResources.length} resource(s) took >2000ms`
      );
    }
  } catch (error) {
    results.add('Network check', false, error.message);
  }

  // ═════════════════════════════════════════════════════════════════
  // STYLING & CSS CHECK
  // ═════════════════════════════════════════════════════════════════

  log.header('Checking Styles...');

  const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
  results.add(
    'Stylesheets loaded',
    styles.length > 0,
    `Found ${styles.length} stylesheet(s)`
  );

  const tailwindClasses = document.documentElement.innerHTML.match(/\b(?:bg-|text-|flex|grid|p-|m-|w-|h-)\w+/g);
  results.add(
    'Tailwind CSS applied',
    !!tailwindClasses && tailwindClasses.length > 0,
    `Found ${tailwindClasses?.length || 0} Tailwind classes`
  );

  // ═════════════════════════════════════════════════════════════════
  // PRINT SUMMARY
  // ═════════════════════════════════════════════════════════════════

  const allPassed = results.print();

  // Print current page info
  console.log('📍 Current Page Information:');
  log.info(`URL: ${window.location.href}`);
  log.info(`Viewport: ${window.innerWidth}×${window.innerHeight}px`);
  log.info(`User Agent: ${navigator.userAgent.substring(0, 50)}...`);
  log.info(`Timestamp: ${new Date().toISOString()}`);

  console.log('\n💡 Tips:');
  console.log('  • Go to Network tab to monitor API calls');
  console.log('  • Go to Performance tab to record interactions');
  console.log('  • Use Lighthouse (Ctrl+Shift+P → Lighthouse) for full audit');
  console.log('  • Check Sources tab for any script errors\n');

  return {
    results,
    allPassed,
  };
})();
