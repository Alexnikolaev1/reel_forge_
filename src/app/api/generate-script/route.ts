import { NextRequest, NextResponse } from "next/server";
import { generateScript } from "@/lib/actions";
import { getSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { logError, withTiming } from "@/lib/logger";
import { z } from "zod";

const bodySchema = z.object({
  topic:    z.string().min(3).max(500),
  style:    z.string().min(1),
  duration: z.number().int().min(10).max(30),
});

export async function POST(req: NextRequest) {
  try {
    const rate = checkRateLimit("generate-script", req.headers, 8, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Слишком много запросов, попробуйте чуть позже" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)) } }
      );
    }

    const isAuthenticated = await getSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = await req.json();
    const { topic, style, duration } = bodySchema.parse(body);
    const result = await withTiming(
      "api.generate-script",
      () => generateScript(topic, style, duration),
      { topicLength: topic.length, style, duration, ip: rate.ip }
    );
    return NextResponse.json(result);
  } catch (err) {
    logError("api.generate-script.error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Внутренняя ошибка" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
