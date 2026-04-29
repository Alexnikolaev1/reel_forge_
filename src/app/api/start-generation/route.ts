import { NextRequest, NextResponse } from "next/server";
import { createVideoProject } from "@/lib/actions";
import { getSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { logError, logInfo } from "@/lib/logger";
import { z } from "zod";

const bodySchema = z.object({
  projectId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const rate = checkRateLimit("start-generation", req.headers, 5, 60_000);
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

    const { projectId } = bodySchema.parse(await req.json());
    logInfo("api.start-generation.accepted", { projectId, ip: rate.ip });

    createVideoProject(projectId).catch((err) => {
      logError("pipeline.error", {
        projectId,
        error: err instanceof Error ? err.message : String(err),
      });
    });

    return NextResponse.json({ ok: true, projectId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ошибка" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
