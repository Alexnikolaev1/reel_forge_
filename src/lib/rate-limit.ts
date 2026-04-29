type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function getClientIp(headerValue: string | null): string {
  if (!headerValue) return "unknown";
  return headerValue.split(",")[0]?.trim() || "unknown";
}

export function checkRateLimit(
  keyPrefix: string,
  requestHeaders: Headers,
  limit: number,
  windowMs: number
) {
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  const realIp = requestHeaders.get("x-real-ip");
  const ip = getClientIp(forwardedFor) || getClientIp(realIp);
  const now = Date.now();
  const bucketKey = `${keyPrefix}:${ip}`;
  const existing = buckets.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: now + windowMs,
      ip,
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      ip,
    };
  }

  existing.count += 1;
  buckets.set(bucketKey, existing);

  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    ip,
  };
}
