import { NextRequest, NextResponse } from "next/server";
import { apiWrapper } from "@/lib/api-wrapper";
import { validateCronSecret } from "../guard";
import { DealService } from "@/services/deal.service";
import { acquireDistributedLock, releaseDistributedLock } from "@/lib/lock";

async function _handler(_req: NextRequest) {
  await validateCronSecret(_req);

  const lockKey = "cron:content-auto-approve:lock";
  const lock = await acquireDistributedLock(lockKey, 120);
  if (!lock) {
    return NextResponse.json({ success: true, skipped: true, message: "Content auto-approval already running." });
  }

  try {
    const result = await DealService.autoApproveExpiredContent();

    return NextResponse.json({
      success: true,
      message: "Content auto-approval completed",
      data: result,
    });
  } finally {
    await releaseDistributedLock(lockKey, lock);
  }
}

export const GET = apiWrapper(_handler);
export const POST = apiWrapper(_handler);

