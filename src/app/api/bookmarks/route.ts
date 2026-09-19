import { NextResponse } from "next/server";
import { apiWrapper } from "@/lib/api-wrapper";
import { redis } from "@/lib/redis";
import { bookmarkRequestSchema } from "@/lib/schemas";
import { AppError } from "@/lib/errors";

// In-memory fallback set for testing/offline environments
const memoryBookmarks = new Set<string>();

export const GET = apiWrapper(
  async (req) => {
    const userId = req.session?.user?.id;
    if (!userId) {
      throw AppError.unauthorized();
    }

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
  },
  { requireAuth: true }
);

export const POST = apiWrapper(
  async (req) => {
    const userId = req.session?.user?.id;
    if (!userId) {
      throw AppError.unauthorized();
    }

    const body = (req.validBody ?? (await req.json())) as {
      targetId: string;
      targetType: string;
      isSaved: boolean;
    };

    const { targetId, targetType, isSaved } = body;
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
  },
  {
    requireAuth: true,
    validate: { body: bookmarkRequestSchema },
  }
);
