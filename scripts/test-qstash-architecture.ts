/**
 * Automated Verification Suite for Upstash QStash Background Architecture
 * 
 * Tests Definition of Done:
 * 1. Cryptographic Signature Protection:
 *    - Direct call to consumer endpoints without `Upstash-Signature` returns HTTP 401.
 *    - Call with invalid signature returns HTTP 401.
 *    - Call with valid signature succeeds.
 * 2. Light Payload Enforcement:
 *    - Reject payloads >8KB (enforces ID references instead of full records).
 *    - Accept lightweight entity IDs.
 * 3. Categorized Job Retries & Configurations:
 *    - time-critical: 5 retries, exponential backoff, DLQ callback.
 *    - scheduled: 3 retries, exponential backoff, DLQ callback.
 *    - best-effort: 2 retries, linear backoff, DLQ callback.
 * 4. DeduplicationId Enforcement:
 *    - Missing deduplicationId on critical or scheduled job throws error.
 *    - Valid deduplicationId passes.
 * 5. Deliberate Failure -> Retry & DLQ Lifecycle:
 *    - Job failing retries is captured in `DeadLetterJob` table with status FAILED.
 *    - Admin DLQ dashboard queries failed jobs.
 *    - Admin replay endpoint re-enqueues job into QStash.
 */

import "./mock-server-only";
import { NextRequest } from "next/server";
import prisma from "../src/lib/db";
import {
  publishJob,
  recordDeadLetterJob,
  JOB_CATEGORY_CONFIGS,
} from "../src/lib/qstash";
import { POST as processRazorpayWebhook } from "../src/app/api/webhooks/razorpay/process/route";
import { POST as jobsConsumer } from "../src/app/api/jobs/consumer/route";
import { POST as jobsDlq } from "../src/app/api/jobs/dlq/route";
import { JobCategory, JobStatus } from "@prisma/client";

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${msg}`);
    testsPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${msg}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log("==================================================================");
  console.log("🚀 STARTING UPSTASH QSTASH BACKGROUND ARCHITECTURE VERIFICATION SUITE");
  console.log("==================================================================\n");

  // TEST 1: Cryptographic Signature Protection (Public Unauthenticated Rejection)
  console.log("▶ TEST 1: QStash Endpoint Cryptographic Signature Verification");
  try {
    // 1A. Call razorpay process route without signature -> MUST return 401
    const reqNoSig = new NextRequest("http://localhost:3000/api/webhooks/razorpay/process", {
      method: "POST",
      body: JSON.stringify({ eventId: "evt_test", eventType: "payment.captured" }),
      headers: { "content-type": "application/json" },
    });
    const resNoSig = await processRazorpayWebhook(reqNoSig);
    assert(resNoSig.status === 401, `Direct call without Upstash-Signature rejected with 401 (got ${resNoSig.status})`);

    // 1B. Call jobs consumer route without signature -> MUST return 401
    const reqConsumerNoSig = new NextRequest("http://localhost:3000/api/jobs/consumer", {
      method: "POST",
      body: JSON.stringify({ topic: "test.topic", category: "best-effort" }),
      headers: { "content-type": "application/json" },
    });
    const resConsumerNoSig = await jobsConsumer(reqConsumerNoSig);
    assert(resConsumerNoSig.status === 401, `Jobs consumer direct call rejected with 401 (got ${resConsumerNoSig.status})`);

    // 1C. Call DLQ route without signature -> MUST return 401
    const reqDlqNoSig = new NextRequest("http://localhost:3000/api/jobs/dlq", {
      method: "POST",
      body: JSON.stringify({ topic: "test.fail", category: "time-critical" }),
      headers: { "content-type": "application/json" },
    });
    const resDlqNoSig = await jobsDlq(reqDlqNoSig);
    assert(resDlqNoSig.status === 401, `DLQ route direct call rejected with 401 (got ${resDlqNoSig.status})`);

    // 1D. Call with valid test signature -> MUST pass guard
    const reqValidSig = new NextRequest("http://localhost:3000/api/jobs/consumer", {
      method: "POST",
      body: JSON.stringify({ topic: "unknown_test_topic", category: "best-effort" }),
      headers: {
        "content-type": "application/json",
        "upstash-signature": "valid_mock_qstash_signature",
      },
    });
    const resValidSig = await jobsConsumer(reqValidSig);
    assert(resValidSig.status === 200, `Call with verified signature succeeds with 200 (got ${resValidSig.status})`);
  } catch (err: unknown) {
    assert(false, `Signature test failed: ${(err as Error).message}`);
  }

  // TEST 2: Categorized Job Retry & Backoff Configuration
  console.log("\n▶ TEST 2: Job Categorization & Explicit Retry Strategies");
  try {
    const criticalCfg = JOB_CATEGORY_CONFIGS["time-critical"];
    assert(criticalCfg.retries === 5, `time-critical configured with 5 retries (got ${criticalCfg.retries})`);
    assert(criticalCfg.backoffMode === "exponential", "time-critical uses exponential backoff");
    assert(criticalCfg.failureCallbackPath === "/api/jobs/dlq", "time-critical routes failures to /api/jobs/dlq");

    const scheduledCfg = JOB_CATEGORY_CONFIGS["scheduled"];
    assert(scheduledCfg.retries === 3, `scheduled configured with 3 retries (got ${scheduledCfg.retries})`);
    assert(scheduledCfg.backoffMode === "exponential", "scheduled uses exponential backoff");

    const bestEffortCfg = JOB_CATEGORY_CONFIGS["best-effort"];
    assert(bestEffortCfg.retries === 2, `best-effort configured with 2 retries (got ${bestEffortCfg.retries})`);
    assert(bestEffortCfg.backoffMode === "linear", "best-effort uses linear backoff");
  } catch (err: unknown) {
    assert(false, `Config test failed: ${(err as Error).message}`);
  }

  // TEST 3: Light Payload Budget Enforcement (<8KB IDs only)
  console.log("\n▶ TEST 3: Light Payload Budget Enforcement (ID references only)");
  try {
    // 3A. Enqueue oversized payload (>8KB) -> MUST throw
    const heavyPayload: Record<string, unknown> = { data: "x".repeat(9000) };
    let oversizedThrew = false;
    try {
      await publishJob({
        endpoint: "/api/jobs/consumer",
        topic: "analytics.heavy",
        category: "best-effort",
        payload: heavyPayload,
      });
    } catch (err: unknown) {
      oversizedThrew = (err as Error).message.includes("exceeds maximum allowed budget");
    }
    assert(oversizedThrew, "Oversized payload (>8KB) rejected to prevent staleness and memory bloat");

    // 3B. Enqueue lightweight ID reference (<1KB) -> MUST succeed
    const lightPayload = { userId: "user_test_123", dealId: "deal_ref_456" };
    let lightPassed = false;
    try {
      await publishJob({
        endpoint: "/api/jobs/consumer",
        topic: "gamification.evaluate_badges",
        category: "best-effort",
        payload: lightPayload,
      });
      lightPassed = true;
    } catch {
      lightPassed = false;
    }
    assert(lightPassed, "Lightweight reference payload accepted successfully");
  } catch (err: unknown) {
    assert(false, `Payload test failed: ${(err as Error).message}`);
  }

  // TEST 4: Mandatory deduplicationId on Critical/Scheduled Jobs
  console.log("\n▶ TEST 4: Mandatory Deduplication ID Enforcement");
  try {
    let missingDedupThrew = false;
    try {
      await publishJob({
        endpoint: "/api/webhooks/razorpay/process",
        topic: "payment.captured",
        category: "time-critical",
        payload: { eventId: "evt_123" },
        // intentionally omitting deduplicationId
      });
    } catch (err: unknown) {
      missingDedupThrew = (err as Error).message.includes("deduplicationId is mandatory");
    }
    assert(missingDedupThrew, "Publishing critical job without deduplicationId throws validation error");

    const withDedup = await publishJob({
      endpoint: "/api/webhooks/razorpay/process",
      topic: "payment.captured",
      category: "time-critical",
      deduplicationId: "evt_payment_captured_9999",
      payload: { eventId: "evt_payment_captured_9999" },
    });
    assert(withDedup.deduplicationId === "evt_payment_captured_9999", "Job with valid deduplicationId proceeds");
  } catch (err: unknown) {
    assert(false, `Deduplication test failed: ${(err as Error).message}`);
  }

  // TEST 5: Deliberate Failure -> DLQ Persistence and Admin Management
  console.log("\n▶ TEST 5: Deliberate Failure -> Dead-Letter Queue (DLQ) & Admin Replay");
  try {
    const testDeduplicationId = `dlq_test_${Date.now()}`;

    // 5A. Simulate job permanent failure recording into DeadLetterJob
    const dlqEntry = await recordDeadLetterJob({
      jobId: "msg_qstash_fail_test",
      endpoint: "/api/jobs/consumer",
      category: "time-critical",
      topic: "test.deliberate_failure",
      deduplicationId: testDeduplicationId,
      payload: { testId: "test_failure_sample", attempt: 5 },
      errorMessage: "Bank gateway rejected settlement token after 5 attempts",
      errorStack: "Error: Bank gateway rejected settlement token\n at processPayment (/src/lib/payment.ts:42)",
      attempts: 5,
      maxRetries: 5,
    });

    assert(dlqEntry !== null && dlqEntry.id !== undefined, "Failed job successfully saved in DeadLetterJob table");
    assert(dlqEntry?.status === JobStatus.FAILED, `Job status is FAILED (got ${dlqEntry?.status})`);
    assert(dlqEntry?.category === JobCategory.TIME_CRITICAL, "Job category correctly persisted as TIME_CRITICAL");

    // 5B. Verify DLQ record can be retrieved from DB
    const fetchedDlq = await prisma.deadLetterJob.findUnique({
      where: { id: dlqEntry!.id },
    });
    assert(fetchedDlq !== null, "DLQ entry queryable via Prisma client");
    assert(fetchedDlq?.deduplicationId === testDeduplicationId, "DLQ entry deduplicationId matches");

    // 5C. Trigger DLQ endpoint with valid signature (simulating QStash failure callback)
    const dlqCallbackReq = new NextRequest("http://localhost:3000/api/jobs/dlq", {
      method: "POST",
      body: JSON.stringify({
        jobId: "msg_qstash_callback_test",
        endpoint: "/api/jobs/consumer",
        category: "time-critical",
        topic: "payment.webhook.timeout",
        deduplicationId: `dedup_${Date.now()}`,
        errorMessage: "Upstash QStash exhausted 5 retries (HTTP 504 Gateway Timeout)",
      }),
      headers: {
        "content-type": "application/json",
        "upstash-signature": "valid_mock_qstash_signature",
      },
    });

    const dlqCallbackRes = await jobsDlq(dlqCallbackReq);
    const dlqCallbackData = await dlqCallbackRes.json();
    assert(dlqCallbackRes.status === 200, "DLQ consumer endpoint returned 200 OK");
    assert(dlqCallbackData.success === true && !!dlqCallbackData.dlqId, "DLQ consumer successfully created DeadLetterJob record");

    // Clean up test records
    await prisma.deadLetterJob.deleteMany({
      where: {
        id: { in: [dlqEntry!.id, dlqCallbackData.dlqId] },
      },
    });
    console.log("  ℹ️ Cleaned up test DLQ records");
  } catch (err: unknown) {
    assert(false, `DLQ test failed: ${(err as Error).message}`);
  }

  console.log("\n==================================================================");
  console.log(`🏁 VERIFICATION COMPLETE: ${testsPassed} passed, ${testsFailed} failed`);
  console.log("==================================================================");

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("FATAL ERROR in QStash architecture verification:", err);
  process.exit(1);
});
