import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { bookmarkRequestSchema } from "@/lib/schemas";

// In-memory fallback set for testing/offline environments
const memoryBookmarks = new Set<string>();

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const redisKey = `user:${userId}:bookmarks`;

    try {
      if (redis) {
        const savedIds = await redis.smembers(redisKey);
        return NextResponse.json({ success: true, savedIds });
      }
    } catch {
      // Fallback
    }

    const userSaved = Array.from(memoryBookmarks)
      .filter((k) => k.startsWith(`${userId}:`))
      .map((k) => k.split(":")[1]!);

    return NextResponse.json({ success: true, savedIds: userSaved });
  } catch (err) {
    logger.error("GET /api/bookmarks error:", err);
    return NextResponse.json({ error: "Failed to fetch bookmarks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = bookmarkRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const { targetId, targetType, isSaved } = parsed.data;

    const userId = session.user.id;
    const redisKey = `user:${userId}:bookmarks`;
    const itemKey = `${userId}:${targetId}`;

    try {
      if (redis) {
        if (isSaved) {
          await redis.sadd(redisKey, targetId);
        } else {
          await redis.srem(redisKey, targetId);
        }
      }
    } catch {
      // Fallback to memory
    }

    if (isSaved) {
      memoryBookmarks.add(itemKey);
    } else {
      memoryBookmarks.delete(itemKey);
    }

    return NextResponse.json({
      success: true,
      targetId,
      targetType,
      isSaved,
    });
  } catch (err) {
    logger.error("POST /api/bookmarks error:", err);
    return NextResponse.json({ error: "Failed to toggle bookmark" }, { status: 500 });
  }
}
