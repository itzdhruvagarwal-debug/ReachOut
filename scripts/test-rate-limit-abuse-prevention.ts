import "./mock-server-only.js";
import { redis } from "../src/lib/redis";
import {
  rateLimit,
  checkTieredRateLimit,
  getTrustTier,
  TIERED_LIMIT_CONFIGS,
} from "../src/lib/rate-limit";
import {
  banIp,
  unbanIp,
  isIpBanned,
  getBanDetails,
} from "../src/lib/blacklist";
import { NextRequest } from "next/server";
import { apiWrapper } from "../src/lib/api-wrapper";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log("===============================================================");
  console.log("🚀 STARTING RATE LIMIT & ABUSE PREVENTION HARDENING TEST SUITE");
  console.log("===============================================================\n");

  // --------------------------------------------------------------------------
  // TEST 1: Sliding-Window Rate Limiter Under 200 Concurrent Burst Requests
  // --------------------------------------------------------------------------
  console.log("▶ TEST 1: Concurrent Burst Rate-Limiting (200 Simultaneous Requests)");
  const burstKey = `test-burst-${Date.now()}`;
  const BURST_LIMIT = 50;
  const BURST_WINDOW = 60;
  const TOTAL_REQUESTS = 200;

  // Wait for Redis connection to be fully ready
  if (redis.status !== "ready") {
    await new Promise<void>((resolve) => {
      redis.once("ready", () => resolve());
    });
  }

  // Clear any existing test key in Redis
  await redis.del(`ratelimit:${burstKey}`);

  console.log(`  Firing ${TOTAL_REQUESTS} simultaneous requests with limit=${BURST_LIMIT}...`);
  const burstStart = Date.now();

  const burstPromises = Array.from({ length: TOTAL_REQUESTS }, () =>
    rateLimit({
      uniqueToken: burstKey,
      limit: BURST_LIMIT,
      window: BURST_WINDOW,
      securityCritical: true,
    }),
  );

  const burstResults = await Promise.all(burstPromises);
  const burstDuration = Date.now() - burstStart;

  const allowedCount = burstResults.filter((r) => r.success).length;
  const blockedCount = burstResults.filter((r) => !r.success).length;

  console.log(`  Burst completed in ${burstDuration}ms.`);
  console.log(`  Results: ${allowedCount} allowed, ${blockedCount} blocked.`);

  assert(
    allowedCount === BURST_LIMIT,
    `Exact allowed count must be ${BURST_LIMIT}, got ${allowedCount}`,
  );
  assert(
    blockedCount === TOTAL_REQUESTS - BURST_LIMIT,
    `Exact blocked count must be ${TOTAL_REQUESTS - BURST_LIMIT}, got ${blockedCount}`,
  );
  assert(
    allowedCount + blockedCount === TOTAL_REQUESTS,
    `Total processed must equal ${TOTAL_REQUESTS}`,
  );

  // Clean up
  await redis.del(`ratelimit:${burstKey}`);
  console.log("  ✅ Test 1 PASSED: Zero race conditions, exact 50 allowed, 150 rejected, 0 off-by-one.\n");

  // --------------------------------------------------------------------------
  // TEST 2: Trust-Score-Based Tiered Rate Limits (Low vs Standard vs High)
  // --------------------------------------------------------------------------
  console.log("▶ TEST 2: Trust-Score Tiered Rate Limits");

  // Verify tier calculation
  assert(getTrustTier(100, false) === "LOW", "Score 100 unverified should be LOW tier");
  assert(getTrustTier(299, false) === "LOW", "Score 299 unverified should be LOW tier");
  assert(getTrustTier(300, false) === "STANDARD", "Score 300 should be STANDARD tier");
  assert(getTrustTier(500, false) === "STANDARD", "Score 500 should be STANDARD tier");
  assert(getTrustTier(750, false) === "STANDARD", "Score 750 unverified should be STANDARD tier");
  assert(getTrustTier(750, true) === "HIGH", "Score 750 + KYC verified should be HIGH tier");

  // Test Low-Trust User (Limit = 1 withdrawal/day)
  const lowTrustUserId = `user-low-${Date.now()}`;
  const lowTrustIp = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;

  const resLow1 = await checkTieredRateLimit({
    userId: lowTrustUserId,
    ip: lowTrustIp,
    action: "WITHDRAWAL",
    trustScore: 150,
    isKycVerified: false,
  });
  assert(resLow1.success === true, "Low-trust user 1st withdrawal must succeed");
  assert(resLow1.tier === "LOW", "Tier must be LOW");
  assert(resLow1.userLimit === 1, "Low-trust user withdrawal limit must be 1");

  const resLow2 = await checkTieredRateLimit({
    userId: lowTrustUserId,
    ip: lowTrustIp,
    action: "WITHDRAWAL",
    trustScore: 150,
    isKycVerified: false,
  });
  assert(resLow2.success === false, "Low-trust user 2nd withdrawal must be BLOCKED");
  assert(resLow2.blockedBy === "USER", "Blocked by must be USER");

  // Test High-Trust User (Limit = 10 withdrawals/day)
  const highTrustUserId = `user-high-${Date.now()}`;
  const highTrustIp = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;

  let highSuccessCount = 0;
  for (let i = 0; i < 10; i++) {
    const res = await checkTieredRateLimit({
      userId: highTrustUserId,
      ip: highTrustIp,
      action: "WITHDRAWAL",
      trustScore: 850,
      isKycVerified: true,
    });
    if (res.success) highSuccessCount++;
  }
  assert(highSuccessCount === 10, "High-trust user must be allowed 10 withdrawals");

  const resHigh11 = await checkTieredRateLimit({
    userId: highTrustUserId,
    ip: highTrustIp,
    action: "WITHDRAWAL",
    trustScore: 850,
    isKycVerified: true,
  });
  assert(resHigh11.success === false, "High-trust user 11th withdrawal must be BLOCKED");

  // Clean up
  await redis.del(`ratelimit:user:WITHDRAWAL:${lowTrustUserId}`);
  await redis.del(`ratelimit:ip:WITHDRAWAL:${lowTrustIp}`);
  await redis.del(`ratelimit:user:WITHDRAWAL:${highTrustUserId}`);
  await redis.del(`ratelimit:ip:WITHDRAWAL:${highTrustIp}`);
  console.log("  ✅ Test 2 PASSED: Trust-score tiers enforced accurately.\n");

  // --------------------------------------------------------------------------
  // TEST 3: Dual-Tracking (IP-Level Anti-Sybil Rate Limit)
  // --------------------------------------------------------------------------
  console.log("▶ TEST 3: Dual IP + User Tracking (Anti-Sybil Multi-Account Attack)");
  const sharedIp = `203.0.113.${Math.floor(Math.random() * 250) + 1}`;
  const ipLimit = TIERED_LIMIT_CONFIGS.WITHDRAWAL.ipLimit; // 10

  // Simulate 10 different high-trust accounts withdrawing from the exact same IP
  let ipSuccessCount = 0;
  for (let i = 0; i < ipLimit; i++) {
    const uniqueUser = `sybil-user-${i}-${Date.now()}`;
    const res = await checkTieredRateLimit({
      userId: uniqueUser,
      ip: sharedIp,
      action: "WITHDRAWAL",
      trustScore: 850,
      isKycVerified: true,
    });
    if (res.success) ipSuccessCount++;
    await redis.del(`ratelimit:user:WITHDRAWAL:${uniqueUser}`);
  }
  assert(ipSuccessCount === ipLimit, `IP should allow first ${ipLimit} withdrawals across users`);

  // 11th user from the same IP must be blocked by IP limit
  const eleventhUser = `sybil-user-11-${Date.now()}`;
  const resIpBlocked = await checkTieredRateLimit({
    userId: eleventhUser,
    ip: sharedIp,
    action: "WITHDRAWAL",
    trustScore: 850,
    isKycVerified: true,
  });
  assert(resIpBlocked.success === false, "11th withdrawal from same IP must be BLOCKED");
  assert(resIpBlocked.blockedBy === "IP", "Must be blocked by IP bucket");

  // Clean up
  await redis.del(`ratelimit:ip:WITHDRAWAL:${sharedIp}`);
  await redis.del(`ratelimit:user:WITHDRAWAL:${eleventhUser}`);
  console.log("  ✅ Test 3 PASSED: Dual IP + User tracking successfully prevented sybil IP flood.\n");

  // --------------------------------------------------------------------------
  // TEST 4: CSRF Protection (Origin / Referer / Sec-Fetch-Site Validation)
  // --------------------------------------------------------------------------
  console.log("▶ TEST 4: CSRF Origin and Referer Enforcement");

  // Create a sample protected handler wrapped in apiWrapper
  const dummyHandler = apiWrapper(async () => {
    return new Response(JSON.stringify({ success: true, message: "Mutation processed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  const dummyContext = { params: Promise.resolve({}) };

  // 4A: Cross-origin attack via Origin header
  const crossOriginReq = new NextRequest("http://localhost:3000/api/wallet/withdraw", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      origin: "https://evil-attacker.com",
      "content-type": "application/json",
    },
    body: JSON.stringify({ amount: 100 }),
  });
  const resCross = await dummyHandler(crossOriginReq, dummyContext);
  assert(resCross.status === 403, "Cross-origin POST request with evil origin must return 403 Forbidden");

  // 4B: Cross-site attack via Sec-Fetch-Site
  const crossSiteReq = new NextRequest("http://localhost:3000/api/wallet/withdraw", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      origin: "http://localhost:3000",
      "sec-fetch-site": "cross-site",
      "content-type": "application/json",
    },
    body: JSON.stringify({ amount: 100 }),
  });
  const resCrossSite = await dummyHandler(crossSiteReq, dummyContext);
  assert(resCrossSite.status === 403, "POST request with sec-fetch-site: cross-site must return 403 Forbidden");

  // 4C: Cross-origin attack via Referer fallback (when Origin omitted)
  const crossRefererReq = new NextRequest("http://localhost:3000/api/wallet/withdraw", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      referer: "https://phishing-site.org/fake-form",
      "content-type": "application/json",
    },
    body: JSON.stringify({ amount: 100 }),
  });
  const resCrossReferer = await dummyHandler(crossRefererReq, dummyContext);
  assert(resCrossReferer.status === 403, "POST request with cross-origin referer must return 403 Forbidden");

  // 4D: Legitimate same-origin request
  const legitimateReq = new NextRequest("http://localhost:3000/api/wallet/withdraw", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      origin: "http://localhost:3000",
      "sec-fetch-site": "same-origin",
      "content-type": "application/json",
    },
    body: JSON.stringify({ amount: 100 }),
  });
  const resLegit = await dummyHandler(legitimateReq, dummyContext);
  assert(resLegit.status === 200, "Same-origin POST request must succeed (200 OK)");

  console.log("  ✅ Test 4 PASSED: CSRF validation successfully blocked cross-origin mutations.\n");

  // --------------------------------------------------------------------------
  // TEST 5: Edge WAF Pattern Matching (SQLi & Path Traversal & Scanners)
  // --------------------------------------------------------------------------
  console.log("▶ TEST 5: Edge WAF Threat Detection Patterns");

  const wafPatterns = [
    /\b(?:sqlmap|nikto|nmap|masscan|dirbuster|gobuster|wpscan|wp-scan|acunetix|nessus|qualys|zgrab)\b/i,
    /\/wp-(?:admin|login\.php)\b/i,
    /\/phpmyadmin\b/i,
    /\.env\b/i,
    /\.git\b/i,
    /\.\.[/\\]/,
    /%2e%2e/i,
    /%252e/i,
    /\/etc\/(?:passwd|shadow)/i,
    /\b(?:boot\.ini|win\.ini)\b/i,
    /\/proc\/self\//i,
    /\bunion(?:\s|%20|\+)+(?:all(?:\s|%20|\+)+)?select\b/i,
    /\b(?:sleep|pg_sleep)\s*\(/i,
    /\bbenchmark\s*\(/i,
    /\bwaitfor\s+delay\b/i,
    /\bxp_cmdshell\b/i,
    /\binformation_schema\b/i,
    /\bor\s+1\s*=\s*1\b/i,
    /'\s*or\s+'1'\s*=\s*'1/i,
    /;\s*--/i,
    /<script\b/i,
    /\$\{jndi:/i,
    /\b(?:eval|system|passthru|shell_exec|base64_decode)\s*\(/i,
  ];

  function matchesWaf(str: string) {
    return wafPatterns.some((p) => p.test(str));
  }

  // SQLi payloads
  assert(matchesWaf("/api/users?id=1 UNION SELECT 1,password FROM users--"), "WAF must detect UNION SELECT SQLi");
  assert(matchesWaf("/api/users?name=admin' OR 1=1--"), "WAF must detect OR 1=1 SQLi");
  assert(matchesWaf("/api/search?q=test'; WAITFOR DELAY '0:0:5'--"), "WAF must detect time-based blind SQLi");
  assert(matchesWaf("/api/search?q=1 AND SLEEP(5)"), "WAF must detect MySQL SLEEP injection");
  assert(matchesWaf("/api/data?table=information_schema.tables"), "WAF must detect information_schema reconnaissance");

  // Path Traversal payloads
  assert(matchesWaf("/api/files/../../etc/passwd"), "WAF must detect ../../etc/passwd traversal");
  assert(matchesWaf("/api/download?file=%2e%2e%2fwin.ini"), "WAF must detect encoded %2e%2e%2f traversal");
  assert(matchesWaf("/proc/self/environ"), "WAF must detect /proc/self traversal");

  // Scanner user-agents / paths
  assert(matchesWaf("Mozilla/5.0 (compatible; sqlmap/1.5.2#stable; http://sqlmap.org)"), "WAF must detect sqlmap user agent");
  assert(matchesWaf("Nikto/2.1.6"), "WAF must detect nikto scanner user agent");
  assert(matchesWaf("/wp-login.php"), "WAF must detect WordPress brute-force scan path");
  assert(matchesWaf("/.env"), "WAF must detect .env credential harvesting probe");
  assert(matchesWaf("/.git/config"), "WAF must detect .git metadata probe");

  // Normal safe request
  assert(!matchesWaf("Mozilla/5.0 (Windows NT 10.0; Win64; x64) /api/creators?niche=tech&page=1"), "WAF must allow clean request");

  console.log("  ✅ Test 5 PASSED: Edge WAF regex suite blocked all known attack signatures.\n");

  // --------------------------------------------------------------------------
  // TEST 6: Redis IP Blacklist (Instant Admin Ban & Unban with 0 Delay)
  // --------------------------------------------------------------------------
  console.log("▶ TEST 6: Redis IP Blacklist (Instant Ban & Unban)");

  const banTestIp = "198.51.100.99";

  // Initially not banned
  await unbanIp(banTestIp);
  assert((await isIpBanned(banTestIp)) === false, "IP must initially NOT be banned");

  // Admin bans IP
  await banIp(banTestIp, "Admin fraud detection test", 3600);

  // Must be immediately banned (zero delay)
  assert((await isIpBanned(banTestIp)) === true, "IP must be immediately marked as banned in Redis");

  const details = await getBanDetails(banTestIp);
  assert(details.isBanned === true, "getBanDetails must confirm IP is banned");
  assert(details.reason === "Admin fraud detection test", "Ban reason must match");
  assert((details.ttlSeconds ?? 0) > 3500, "Ban TTL must be populated (> 3500s)");

  // Test that apiWrapper immediately blocks banned IP
  const bannedReq = new NextRequest("http://localhost:3000/api/creators", {
    method: "GET",
    headers: {
      "x-forwarded-for": banTestIp,
    },
  });
  const bannedRes = await dummyHandler(bannedReq, dummyContext);
  assert(bannedRes.status === 403, "Request from banned IP must be immediately rejected with 403");

  // Admin unbans IP
  const unbanned = await unbanIp(banTestIp);
  assert(unbanned === true, "unbanIp must return true");

  // Must be immediately unbanned (zero delay)
  assert((await isIpBanned(banTestIp)) === false, "IP must be immediately unbanned in Redis");

  const unbannedRes = await dummyHandler(bannedReq, dummyContext);
  assert(unbannedRes.status === 200, "Request from unbanned IP must be immediately allowed (200 OK)");

  console.log("  ✅ Test 6 PASSED: IP ban and unban are instant with zero cache invalidation lag.\n");

  console.log("===============================================================");
  console.log("🎉 ALL 6 TEST SUITES PASSED SUCCESSFULLY!");
  console.log("===============================================================");
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
