import { redis } from "./redis";
import { logger } from "./logger";
import prisma from "./db";

const IP_BAN_PREFIX = "ban:ip:";
const TOKEN_REVOKE_PREFIX = "revoke:token:";

/**
 * Dynamic Threat Blacklisting and JWT revocation.
 * Backed by Redis with instant propagation (zero cache delay).
 */

export async function banIp(
  ip: string,
  reason: string,
  durationSeconds: number = 86400,
): Promise<void> {
  try {
    await redis.setex(`${IP_BAN_PREFIX}${ip}`, durationSeconds, reason);
    logger.warn(`[SECURITY] IP Banned: ${ip}`, { reason, durationSeconds });
  } catch (error) {
    logger.error("Failed to ban IP", error);
  }
}

export async function unbanIp(ip: string): Promise<boolean> {
  try {
    const deleted = await redis.del(`${IP_BAN_PREFIX}${ip}`);
    logger.info(`[SECURITY] IP Unbanned: ${ip}`, { success: deleted > 0 });
    return deleted > 0;
  } catch (error) {
    logger.error("Failed to unban IP", error);
    return false;
  }
}

export async function isIpBanned(ip: string): Promise<boolean> {
  try {
    const result = await redis.get(`${IP_BAN_PREFIX}${ip}`);
    return !!result;
  } catch (_error) {
    logger.warn(
      "IP ban check failed due to Redis error (failing open to prevent outage)",
      { ip, error: _error },
    );
    return false;
  }
}

export async function getBanDetails(
  ip: string,
): Promise<{ isBanned: boolean; reason?: string | undefined; ttlSeconds?: number | undefined }> {
  try {
    const key = `${IP_BAN_PREFIX}${ip}`;
    const [reason, ttlSeconds] = await Promise.all([
      redis.get(key),
      redis.ttl(key),
    ]);

    if (!reason) {
      return { isBanned: false };
    }

    return {
      isBanned: true,
      reason,
      ttlSeconds: ttlSeconds > 0 ? ttlSeconds : 0,
    };
  } catch (error) {
    logger.error("Failed to get ban details", error);
    return { isBanned: false };
  }
}

export async function listBannedIps(
  limit: number = 100,
): Promise<Array<{ ip: string; reason: string; ttlSeconds: number }>> {
  try {
    const keys = await redis.keys(`${IP_BAN_PREFIX}*`);
    if (!keys || keys.length === 0) return [];

    const selectedKeys = keys.slice(0, limit);
    const results: Array<{ ip: string; reason: string; ttlSeconds: number }> = [];

    for (const key of selectedKeys) {
      const ip = key.replace(IP_BAN_PREFIX, "");
      const [reason, ttl] = await Promise.all([
        redis.get(key),
        redis.ttl(key),
      ]);
      if (reason) {
        results.push({
          ip,
          reason,
          ttlSeconds: ttl > 0 ? ttl : 0,
        });
      }
    }

    return results;
  } catch (error) {
    logger.error("Failed to list banned IPs", error);
    return [];
  }
}

export async function revokeToken(
  jti: string,
  durationSeconds: number = 86400,
): Promise<void> {
  try {
    // We set the token JTI to be revoked until it naturally expires
    await redis.setex(
      `${TOKEN_REVOKE_PREFIX}${jti}`,
      durationSeconds,
      "revoked",
    );
    logger.info(`[SECURITY] Token Revoked: ${jti}`);
  } catch (error) {
    logger.error("Failed to revoke token", error);
  }
}

export async function isTokenRevoked(jti: string): Promise<boolean> {
  if (!jti) return false;
  try {
    const result = await redis.get(`${TOKEN_REVOKE_PREFIX}${jti}`);
    return !!result;
  } catch (_error) {
    logger.warn(
      "Token revocation check failed due to Redis error (failing open to prevent outage)",
      { jti, error: _error },
    );
    return false;
  }
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  try {
    // 1. Fetch all tracked JTIs for this user from Redis set
    const jtiSetKey = `user:jtis:${userId}`;
    const jtis = await redis.smembers(jtiSetKey);

    // 2. Revoke each JTI
    if (jtis && jtis.length > 0) {
      await Promise.all(jtis.map((jti) => revokeToken(jti)));
    }

    // 3. Clear the set, active session token, and cached admin status (if any)
    await Promise.allSettled([
      redis.del(jtiSetKey),
      redis.del(`active_session:${userId}`),
      redis.del(`admin_verified:${userId}`),
      redis.del(`admin_auth_cache:${userId}`),
    ]);

    // 4. Revoke refresh tokens in the database
    await prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });

    logger.info(`[SECURITY] Revoked all sessions for user: ${userId}`, {
      revokedJtiCount: jtis?.length || 0,
    });
  } catch (error) {
    logger.error("Failed to revoke all user sessions", error, { userId });
  }
}
