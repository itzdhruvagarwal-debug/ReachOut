import "./mock-server-only";
import prisma from "@/lib/db";
import { transitionDealState } from "@/lib/deal-state-machine";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(msg);
  }
}

async function runTests() {
  console.log("==================================================================");
  console.log("   DEAL STATE MACHINE & FINANCIAL ATOMICITY TEST SUITE");
  console.log("==================================================================");

  const timestamp = Date.now();
  const brandEmail = `test-sm-brand-${timestamp}@vyapar.test`;
  const influencerEmail = `test-sm-influencer-${timestamp}@vyapar.test`;
  const adminEmail = `test-sm-admin-${timestamp}@vyapar.test`;

  // 1. Create clean test users
  const brandUser = await prisma.user.create({
    data: {
      email: brandEmail,
      userType: "BRAND",
      passwordHash: "dummyhash123",
      brandProfile: {
        create: {
          companyName: "SM Brand Ltd",
        },
      },
    },
    include: { brandProfile: true },
  });

  const influencerUser = await prisma.user.create({
    data: {
      email: influencerEmail,
      userType: "INFLUENCER",
      passwordHash: "dummyhash123",
      influencerProfile: {
        create: {
          displayName: "SM Influencer",
          instagramHandle: `sminfl_${timestamp}`,
          categories: "tech",
          languages: "hindi,english",
        },
      },
    },
    include: { influencerProfile: true },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      userType: "ADMIN",
      passwordHash: "dummyhash123",
    },
  });

  console.log("✅ Test actors created:", {
    brand: brandUser.id,
    influencer: influencerUser.id,
    admin: adminUser.id,
  });

  // 2. Create campaign & deal
  const campaign = await prisma.campaign.create({
    data: {
      brand: { connect: { id: brandUser.brandProfile!.id } },
      title: `State Machine Test Campaign ${timestamp}`,
      description: "Testing state machine transitions",
      requirements: "Test campaign requirements",
      deliverables: [{ type: "POST", count: 1 }],
      targetCategories: ["tech"],
      targetCities: ["Delhi"],
      targetLanguages: ["hindi"],
      totalBudget: 1000000,
      fundedAmount: 1000000,
      contentDeadline: new Date(Date.now() + 7 * 86400000),
      postingDeadline: new Date(Date.now() + 14 * 86400000),
      status: "ACTIVE",
    },
  });

  const deal = await prisma.deal.create({
    data: {
      campaign: { connect: { id: campaign.id } },
      influencer: { connect: { id: influencerUser.influencerProfile!.id } },
      brand: { connect: { id: brandUser.brandProfile!.id } },
      amount: 100000,
      contractTerms: { scope: "1 Instagram Post", fee: 100000 },
      submissionDeadline: new Date(Date.now() + 3 * 86400000),
      postingDeadline: new Date(Date.now() + 7 * 86400000),
      status: "PENDING_SIGNATURE",
      reviewPeriodHours: 48,
    },
  });

  console.log(`✅ Test deal created: ${deal.id} in status ${deal.status}`);

  try {
    // ------------------------------------------------------------------
    // TEST 1: INVALID TRANSITION EDGES MUST BE REJECTED
    // ------------------------------------------------------------------
    console.log("\n[TEST 1] Verifying invalid transition edges rejection...");

    // Edge: PENDING_SIGNATURE -> CONTENT_APPROVED (Forbidden edge)
    let rejected = false;
    try {
      await transitionDealState({
        dealId: deal.id,
        fromState: "PENDING_SIGNATURE",
        toState: "CONTENT_APPROVED",
        actor: { userId: adminUser.id, role: "ADMIN" },
      });
    } catch (err: unknown) {
      if ((err as Error).message.includes("INVALID_DEAL_TRANSITION")) {
        rejected = true;
      }
    }
    assert(rejected, "PENDING_SIGNATURE -> CONTENT_APPROVED must be rejected");
    console.log("  ✓ PENDING_SIGNATURE -> CONTENT_APPROVED correctly rejected");

    // Edge: PENDING_SIGNATURE -> COMPLETED (Forbidden shortcut)
    rejected = false;
    try {
      await transitionDealState({
        dealId: deal.id,
        toState: "COMPLETED",
        actor: { userId: adminUser.id, role: "ADMIN" },
      });
    } catch (err: unknown) {
      if ((err as Error).message.includes("INVALID_DEAL_TRANSITION")) {
        rejected = true;
      }
    }
    assert(rejected, "PENDING_SIGNATURE -> COMPLETED must be rejected");
    console.log("  ✓ PENDING_SIGNATURE -> COMPLETED correctly rejected");

    // Valid transition: PENDING_SIGNATURE -> ACTIVE
    await transitionDealState({
      dealId: deal.id,
      fromState: "PENDING_SIGNATURE",
      toState: "ACTIVE",
      actor: { userId: brandUser.id, role: "BRAND" },
      reason: "Contract signed and activated",
    });
    const activeDeal = await prisma.deal.findUnique({ where: { id: deal.id } });
    assert(activeDeal?.status === "ACTIVE", "Deal status should be ACTIVE");
    console.log("  ✓ PENDING_SIGNATURE -> ACTIVE transition succeeded");

    // Edge: ACTIVE -> PENDING_SIGNATURE (Backward transition forbidden)
    rejected = false;
    try {
      await transitionDealState({
        dealId: deal.id,
        fromState: "ACTIVE",
        toState: "PENDING_SIGNATURE",
        actor: { userId: brandUser.id, role: "BRAND" },
      });
    } catch (err: unknown) {
      if ((err as Error).message.includes("INVALID_DEAL_TRANSITION")) {
        rejected = true;
      }
    }
    assert(rejected, "ACTIVE -> PENDING_SIGNATURE backward transition must be rejected");
    console.log("  ✓ ACTIVE -> PENDING_SIGNATURE backward transition correctly rejected");

    // ------------------------------------------------------------------
    // TEST 2: ROLE-BASED TRANSITION AUTHORIZATION
    // ------------------------------------------------------------------
    console.log("\n[TEST 2] Verifying role-based permissions...");

    // Edge: ACTIVE -> CONTENT_SUBMITTED
    // Brand tries to submit content -> FORBIDDEN (only INFLUENCER or ADMIN allowed)
    let roleForbidden = false;
    try {
      await transitionDealState({
        dealId: deal.id,
        toState: "CONTENT_SUBMITTED",
        actor: { userId: brandUser.id, role: "BRAND" },
      });
    } catch (err: unknown) {
      if ((err as Error).message.includes("TRANSITION_NOT_PERMITTED_FOR_ROLE")) {
        roleForbidden = true;
      }
    }
    assert(roleForbidden, "Brand cannot trigger CONTENT_SUBMITTED");
    console.log("  ✓ Brand blocked from submitting content (role check passed)");

    // Influencer submits content -> ALLOWED
    await transitionDealState({
      dealId: deal.id,
      fromState: "ACTIVE",
      toState: "CONTENT_SUBMITTED",
      actor: { userId: influencerUser.id, role: "INFLUENCER" },
      reason: "Content submitted for review",
      metadata: { submissionUrl: "https://instagram.com/p/test123" },
    });
    console.log("  ✓ Influencer successfully triggered CONTENT_SUBMITTED");

    // Influencer tries to APPROVE their own content -> FORBIDDEN (only BRAND/ADMIN/SYSTEM allowed)
    roleForbidden = false;
    try {
      await transitionDealState({
        dealId: deal.id,
        fromState: "CONTENT_SUBMITTED",
        toState: "CONTENT_APPROVED",
        actor: { userId: influencerUser.id, role: "INFLUENCER" },
      });
    } catch (err: unknown) {
      if ((err as Error).message.includes("TRANSITION_NOT_PERMITTED_FOR_ROLE")) {
        roleForbidden = true;
      }
    }
    assert(roleForbidden, "Influencer cannot approve their own content");
    console.log("  ✓ Influencer blocked from approving their own content (role check passed)");

    // ------------------------------------------------------------------
    // TEST 3: MANDATORY REASON REQUIREMENT
    // ------------------------------------------------------------------
    console.log("\n[TEST 3] Verifying mandatory reason checks...");

    // Brand requests revision without reason -> REJECTED
    let reasonRequired = false;
    try {
      await transitionDealState({
        dealId: deal.id,
        fromState: "CONTENT_SUBMITTED",
        toState: "REVISION_REQUESTED",
        actor: { userId: brandUser.id, role: "BRAND" },
        reason: "", // Empty reason
      });
    } catch (err: unknown) {
      if ((err as Error).message.includes("REASON_REQUIRED")) {
        reasonRequired = true;
      }
    }
    assert(reasonRequired, "REVISION_REQUESTED must require a non-empty reason");
    console.log("  ✓ Omitted reason correctly rejected for revision request");

    // Brand approves content -> ALLOWED
    await transitionDealState({
      dealId: deal.id,
      fromState: "CONTENT_SUBMITTED",
      toState: "CONTENT_APPROVED",
      actor: { userId: brandUser.id, role: "BRAND" },
      reason: "Content looks great, approved!",
    });
    console.log("  ✓ Brand successfully approved content");

    // ------------------------------------------------------------------
    // TEST 4: ATOMIC FINANCIAL COUPLING & ROLLBACK
    // ------------------------------------------------------------------
    console.log("\n[TEST 4] Verifying atomic financial coupling and rollback on error...");

    // Try transition to COMPLETED with a failing financial handler
    let handlerFailedAndRolledBack = false;
    try {
      await transitionDealState({
        dealId: deal.id,
        fromState: "CONTENT_APPROVED",
        toState: "COMPLETED",
        actor: { userId: adminUser.id, role: "ADMIN" },
        reason: "Milestone payout",
        financialHandler: async (_tx, _d) => {
          throw new Error("SIMULATED_FINANCIAL_LEDGER_ERROR");
        },
      });
    } catch (err: unknown) {
      if ((err as Error).message.includes("SIMULATED_FINANCIAL_LEDGER_ERROR")) {
        handlerFailedAndRolledBack = true;
      }
    }
    assert(handlerFailedAndRolledBack, "Failing financialHandler must throw");

    // Verify deal status did NOT transition to COMPLETED (it must still be CONTENT_APPROVED)
    const checkRolledBackDeal = await prisma.deal.findUnique({ where: { id: deal.id } });
    assert(
      checkRolledBackDeal?.status === "CONTENT_APPROVED",
      `Expected status to remain CONTENT_APPROVED after rollback, got ${checkRolledBackDeal?.status}`,
    );
    console.log("  ✓ Failed financialHandler aborted transaction, status stayed CONTENT_APPROVED");

    // Now execute transition to COMPLETED with successful financial handler
    let financialHandlerRan = false;
    await transitionDealState({
      dealId: deal.id,
      fromState: "CONTENT_APPROVED",
      toState: "COMPLETED",
      actor: { userId: "SYSTEM_PAYMENT", role: "SYSTEM" },
      reason: "All requirements met, escrow released",
      financialHandler: async (_tx, _d) => {
        // Record simulated financial transaction
        financialHandlerRan = true;
      },
    });
    assert(financialHandlerRan, "financialHandler must have executed");
    const completedDeal = await prisma.deal.findUnique({ where: { id: deal.id } });
    assert(completedDeal?.status === "COMPLETED", "Deal must be COMPLETED");
    console.log("  ✓ Successful financial transition completed atomically");

    // ------------------------------------------------------------------
    // TEST 5: TERMINAL STATE LOCKING
    // ------------------------------------------------------------------
    console.log("\n[TEST 5] Verifying terminal state locking...");

    let terminalLocked = false;
    try {
      await transitionDealState({
        dealId: deal.id,
        fromState: "COMPLETED",
        toState: "ACTIVE",
        actor: { userId: adminUser.id, role: "ADMIN" },
      });
    } catch (err: unknown) {
      if ((err as Error).message.includes("TERMINAL_STATE_LOCKED")) {
        terminalLocked = true;
      }
    }
    assert(terminalLocked, "Cannot transition out of COMPLETED terminal state");
    console.log("  ✓ COMPLETED terminal state locked against any further transitions");

    // ------------------------------------------------------------------
    // TEST 6: AUDIT LOG VERIFICATION
    // ------------------------------------------------------------------
    console.log("\n[TEST 6] Verifying immutable audit logs...");

    const auditLogs = await prisma.activityLog.findMany({
      where: {
        entityId: deal.id,
        action: "DEAL_STATUS_TRANSITION",
      },
      orderBy: { createdAt: "asc" },
    });

    interface StateTransitionMeta {
      fromState?: string;
      toState?: string;
      actorRole?: string;
    }

    console.log(`  ✓ Found ${auditLogs.length} audit log entries for deal ${deal.id}:`);
    for (const log of auditLogs) {
      const meta = (log.metadata ?? {}) as StateTransitionMeta;
      console.log(`    - [${log.createdAt.toISOString()}] ${meta.fromState} -> ${meta.toState} by role '${meta.actorRole}' (User: ${log.userId})`);
    }

    assert(auditLogs.length >= 3, "Must have at least 3 state transition audit logs");
    const firstLog = auditLogs[0]!;
    const firstMeta = (firstLog.metadata ?? {}) as StateTransitionMeta;
    assert(firstMeta.fromState === "PENDING_SIGNATURE", "First transition from PENDING_SIGNATURE");
    assert(firstMeta.toState === "ACTIVE", "First transition to ACTIVE");

    console.log("\n==================================================================");
    console.log("🎉 ALL DEAL STATE MACHINE & ATOMICITY TESTS PASSED SUCCESSFULLY!");
    console.log("==================================================================");
  } finally {
    // Cleanup test records with raw SQL to bypass soft-delete cascades
    await prisma.$executeRawUnsafe(`DELETE FROM "ActivityLog" WHERE "entityId" = '${deal.id}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Deal" WHERE id = '${deal.id}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Campaign" WHERE id = '${campaign.id}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "InfluencerProfile" WHERE "userId" = '${influencerUser.id}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "BrandProfile" WHERE "userId" = '${brandUser.id}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE id IN ('${brandUser.id}', '${influencerUser.id}', '${adminUser.id}')`);
    console.log("🧹 Test cleanup completed.");
  }
}

runTests()
  .catch((e) => {
    console.error("❌ Test suite failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
