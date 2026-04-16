/**
 * Hotel Booking System — Cache Performance Benchmark
 * Uses autocannon to compare response times WITHOUT cache vs WITH cache.
 *
 * Usage:
 *   node benchmark.js [BASE_URL]
 *   node benchmark.js http://localhost:3000
 *
 * How it works:
 *   PHASE 1 (No Cache):  Temporarily disables the cache by hitting a unique
 *                        query string per run so every request is a cache miss.
 *   PHASE 2 (With Cache): Hits the normal endpoint so responses are served
 *                         from the in-memory cache after the first request.
 */

const autocannon = require('autocannon');

const BASE_URL = process.argv[2] || 'http://localhost:3000';

// ─── ANSI colours ────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  blue:   '\x1b[34m',
  gray:   '\x1b[90m',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function header(text) {
  const line = '━'.repeat(56);
  console.log(`\n${C.cyan}${C.bold}${line}${C.reset}`);
  console.log(`${C.cyan}${C.bold}  ${text}${C.reset}`);
  console.log(`${C.cyan}${C.bold}${line}${C.reset}`);
}

function pad(str, len, right = false) {
  const s = String(str);
  return right
    ? s.padStart(len)
    : s.padEnd(len);
}

/**
 * Run autocannon benchmark and return a summary object.
 * @param {string} label   - Human-readable label for logging
 * @param {object} opts    - autocannon options (url, connections, duration…)
 */
function runBenchmark(label, opts) {
  return new Promise((resolve, reject) => {
    console.log(`\n${C.gray}  ▶ Running: ${label}${C.reset}`);

    const instance = autocannon({ ...opts, silent: true });

    autocannon.track(instance, { renderProgressBar: true });

    let firstStatus = null;
    instance.on('response', (_client, statusCode) => {
      if (!firstStatus) firstStatus = statusCode;
    });

    instance.on('done', (result) => {
      if (firstStatus && firstStatus !== 200) {
        console.log(`\n  ${C.yellow}⚠ Warning: First response for ${label} was HTTP ${firstStatus}${C.reset}`);
      }
      resolve({
        label,
        requests:   result.requests.total,
        throughput: result.throughput.average,   // bytes/s
        latAvg:     result.latency.average,       // ms
        latMin:     result.latency.min,
        latMax:     result.latency.max,
        latP50:     result.latency.p50,
        latP99:     result.latency.p99,
        rps:        result.requests.average,      // req/s
        errors:     result.errors,
        '4xx':      result['4xxCount'] ?? result.non2xx ?? 0,
        '5xx':      result['5xxCount'] ?? 0,
      });
    });

    instance.on('error', reject);
  });
}

// ─── Rendering the comparison table ──────────────────────────────────────────
function renderTable(noCache, withCache) {
  const metrics = [
    { key: 'rps',      label: 'Req/sec (avg)',    unit: 'req/s', higherIsBetter: true  },
    { key: 'latAvg',   label: 'Latency avg',      unit: 'ms',    higherIsBetter: false },
    { key: 'latP50',   label: 'Latency p50',      unit: 'ms',    higherIsBetter: false },
    { key: 'latP99',   label: 'Latency p99',      unit: 'ms',    higherIsBetter: false },
    { key: 'latMin',   label: 'Latency min',      unit: 'ms',    higherIsBetter: false },
    { key: 'latMax',   label: 'Latency max',      unit: 'ms',    higherIsBetter: false },
    { key: 'requests', label: 'Total requests',    unit: '',      higherIsBetter: true  },
    { key: 'errors',   label: 'Errors',            unit: '',      higherIsBetter: false },
  ];

  const COL = { metric: 24, noCache: 18, withCache: 18, diff: 12 };

  const divider = `  ${'─'.repeat(COL.metric + COL.noCache + COL.withCache + COL.diff + 9)}`;

  console.log(`\n${C.bold}${C.blue}  Performance Comparison Table — GET /rooms${C.reset}`);
  console.log(divider);
  console.log(
    `  ${C.bold}${pad('Metric', COL.metric)}  ${pad('No Cache', COL.noCache, true)}  ${pad('With Cache', COL.withCache, true)}  ${pad('Δ Change', COL.diff, true)}${C.reset}`
  );
  console.log(divider);

  for (const m of metrics) {
    const a = noCache[m.key];
    const b = withCache[m.key];
    const unit = m.unit ? ` ${m.unit}` : '';

    let diffStr = '';
    let diffColor = C.reset;

    if (typeof a === 'number' && typeof b === 'number' && a !== 0) {
      const pct = ((b - a) / a * 100).toFixed(1);
      const improved = m.higherIsBetter ? b > a : b < a;
      diffColor = improved ? C.green : (b === a ? C.reset : C.red);
      diffStr = `${pct > 0 ? '+' : ''}${pct}%`;
    }

    const aStr = `${typeof a === 'number' ? a.toFixed(2) : a}${unit}`;
    const bStr = `${typeof b === 'number' ? b.toFixed(2) : b}${unit}`;

    console.log(
      `  ${pad(m.label, COL.metric)}  ${pad(aStr, COL.noCache, true)}  ${pad(bStr, COL.withCache, true)}  ${diffColor}${pad(diffStr, COL.diff, true)}${C.reset}`
    );
  }

  console.log(divider);

  // Verdict
  const improvement = noCache.latAvg > 0
    ? ((noCache.latAvg - withCache.latAvg) / noCache.latAvg * 100).toFixed(1)
    : 0;
  const rpsGain = noCache.rps > 0
    ? ((withCache.rps - noCache.rps) / noCache.rps * 100).toFixed(1)
    : 0;

  console.log('');
  if (parseFloat(improvement) > 0) {
    console.log(`  ${C.green}${C.bold}✔ Cache reduced average latency by ${improvement}% (${noCache.latAvg.toFixed(2)}ms → ${withCache.latAvg.toFixed(2)}ms)${C.reset}`);
    console.log(`  ${C.green}${C.bold}✔ Cache increased throughput by ${rpsGain}% req/s (${noCache.rps.toFixed(2)} → ${withCache.rps.toFixed(2)} req/s)${C.reset}`);
  } else {
    console.log(`  ${C.yellow}${C.bold}ⓘ Cache did not improve average latency — server may already be fast locally.${C.reset}`);
    console.log(`  ${C.yellow}    This is expected on a local machine with <1ms DB round-trips.${C.reset}`);
    console.log(`  ${C.yellow}    Cache benefits become visible on remote DB connections or high concurrency.${C.reset}`);
  }
  console.log('');
}

// ─── Rate Limit Table ─────────────────────────────────────────────────────────
function renderRateLimitTable(endpoint, limit, total, got429) {
  console.log(`\n${C.bold}${C.blue}  Rate Limit Test — ${endpoint}${C.reset}`);
  const divider = `  ${'─'.repeat(52)}`;
  console.log(divider);
  console.log(`  ${pad('Configured limit', 28)}  ${pad(String(limit) + ' req/60s', 20, true)}`);
  console.log(`  ${pad('Total requests sent', 28)}  ${pad(String(total), 20, true)}`);
  console.log(`  ${pad('429 responses received', 28)}  ${C.red}${pad(String(got429), 20, true)}${C.reset}`);
  console.log(`  ${pad('Requests passed through', 28)}  ${C.green}${pad(String(total - got429), 20, true)}${C.reset}`);
  const ok = got429 > 0;
  console.log(`  ${pad('Status', 28)}  ${ok ? C.green + '✔ Rate limiting active' : C.red + '✘ No 429s — check config'}${C.reset}`);
  console.log(divider);
}

// ─── Simple 429 counter using autocannon ─────────────────────────────────────
function count429(url, connections, amount) {
  return new Promise((resolve) => {
    let count = 0;
    const instance = autocannon({
      url,
      connections,
      amount,
      silent: true,
    });
    instance.on('response', (_client, statusCode) => {
      if (statusCode === 429) count++;
    });
    instance.on('done', () => resolve(count));
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${C.bold}${C.cyan}  Hotel Booking System — Cache Benchmark & Rate Limit Test${C.reset}`);
  console.log(`  ${C.gray}Target: ${BASE_URL}${C.reset}`);

  // Verify server
  const http = require('http');
  await new Promise((resolve, reject) => {
    http.get(`${BASE_URL}/api/health`, (res) => {
      res.resume();
      res.on('end', resolve);
    }).on('error', () => reject(new Error(`Server not reachable at ${BASE_URL}. Run: npm run start`)));
  }).catch((e) => { console.error(`\n${C.red}  ${e.message}${C.reset}\n`); process.exit(1); });

  console.log(`  ${C.green}✔ Server is reachable${C.reset}`);

  const DURATION   = 5;   // seconds per benchmark run
  const CONNECTIONS = 10; // concurrent connections

  // ── BENCHMARK 1: GET /rooms ─────────────────────────────────────────────
  header('BENCHMARK 1: GET /rooms — No Cache vs With Cache');

  console.log(`\n  ${C.yellow}Config: ${CONNECTIONS} connections × ${DURATION}s each run${C.reset}`);

  // Phase 1 — No Cache: use unique ?_cb=<timestamp> query so cache never hits
  const ph1Url = `${BASE_URL}/api/rooms`;
  const noCache = await runBenchmark(`GET /api/rooms (No Cache — unique cache-busting URL per run)`, {
    url: ph1Url,
    connections: CONNECTIONS,
    duration: DURATION,
    requests: [
      {
        method: 'GET',
        // Unique path per worker tick to bust cache
        setupRequest(req) {
          // req.path includes the full path if url is provided
          req.path = `/api/rooms?_cb=${Date.now()}_${Math.random()}`;
          return req;
        },
      },
    ],
  });

  // Brief pause so the cache from phase 1 doesn't contaminate phase 2
  await new Promise(r => setTimeout(r, 1500));

  // Phase 2 — With Cache: hit same URL every time
  const withCache = await runBenchmark('GET /api/rooms (With Cache — same URL every time)', {
    url: `${BASE_URL}/api/rooms`,
    connections: CONNECTIONS,
    duration: DURATION,
  });

  renderTable(noCache, withCache);

  // ── BENCHMARK 2: GET /rooms/:id ─────────────────────────────────────────
  header('BENCHMARK 2: GET /rooms/1 — No Cache vs With Cache');

  const noCache2 = await runBenchmark('GET /api/rooms/1 (No Cache)', {
    url: `${BASE_URL}/api/rooms/1`,
    connections: CONNECTIONS,
    duration: DURATION,
    requests: [
      {
        method: 'GET',
        setupRequest(req) {
          req.path = `/api/rooms/1?_cb=${Date.now()}_${Math.random()}`;
          return req;
        },
      },
    ],
  });

  await new Promise(r => setTimeout(r, 1500));

  const withCache2 = await runBenchmark('GET /api/rooms/1 (With Cache)', {
    url: `${BASE_URL}/api/rooms/1`,
    connections: CONNECTIONS,
    duration: DURATION,
  });

  renderTable(noCache2, withCache2);

  // ── COOLDOWN: wait for throttler window to reset before rate-limit tests ──
  // The benchmarks above sent thousands of requests, exhausting the 60/60s limit.
  // We must wait the full TTL (60s) so the counter resets to 0 before testing.
  header('COOLDOWN: Waiting 62s for throttler window to reset...');
  console.log(`\n  ${C.yellow}The benchmarks above sent thousands of requests, exhausting the rate limit.`);
  console.log(`  Waiting 62 seconds for the throttler window (60s TTL) to fully reset...${C.reset}\n`);

  for (let i = 62; i > 0; i--) {
    process.stdout.write(`\r  ${C.cyan}${C.bold}⏱  ${i}s remaining...${C.reset}   `);
    await new Promise(r => setTimeout(r, 1000));
  }
  process.stdout.write(`\r  ${C.green}${C.bold}✔  Throttler window reset! Starting rate-limit tests...${C.reset}\n\n`);

  // ── RATE LIMIT: Global (GET /rooms, limit 60/60s) ───────────────────────
  header('RATE LIMIT TEST: GET /api/rooms (global 60 req/60s)');
  console.log(`\n  ${C.gray}Sending 80 rapid requests with 20 connections...${C.reset}`);
  const got429_global = await count429(`${BASE_URL}/api/rooms`, 20, 80);
  renderRateLimitTable('GET /rooms', 60, 80, got429_global);

  // ── RATE LIMIT: Strict (POST /auth/login, limit 10/60s) ─────────────────
  header('RATE LIMIT TEST: POST /api/auth/login (strict 10 req/60s)');

  console.log(`\n  ${C.gray}Sending 20 rapid login requests with 5 connections...${C.reset}`);

  const got429_login = await new Promise((resolve) => {
    let count = 0;
    const inst = autocannon({
      url: BASE_URL,
      connections: 5,
      amount: 20,
      silent: true,
      requests: [{
        method: 'POST',
        path: '/api/auth/login',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'benchmark_test', password: 'wrongpassword' }),
      }],
    });
    inst.on('response', (_c, statusCode) => { if (statusCode === 429) count++; });
    inst.on('done', () => resolve(count));
  });

  renderRateLimitTable('POST /api/auth/login', 10, 20, got429_login);

  // ── FINAL SUMMARY ────────────────────────────────────────────────────────
  header('FINAL SUMMARY');

  const checks = [
    { label: 'GET /rooms cache benchmark completed',       ok: true },
    { label: 'GET /rooms/1 cache benchmark completed',     ok: true },
    { label: 'Global rate limiting (GET /rooms)',          ok: got429_global > 0 },
    { label: 'Strict rate limiting (POST /api/auth/login)', ok: got429_login > 0 },
  ];

  console.log('');
  for (const c of checks) {
    const icon = c.ok ? `${C.green}✔` : `${C.red}✘`;
    console.log(`  ${icon} ${c.label}${C.reset}`);
  }
  console.log('');
}

main().catch((e) => {
  console.error(`\n${C.red}Unexpected error: ${e.message}${C.reset}`);
  process.exit(1);
});
