import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rate = checkRateLimit("project-status", _req.headers, 120, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Слишком частые запросы статуса" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)) } }
    );
  }

  const isAuthenticated = await getSession();
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  return NextResponse.json({
    id:           project.id,
    status:       project.status,
    title:        project.title,
    outputUrl:    project.outputUrl,
    errorMessage: project.errorMessage,
    scenes: project.scenes.map((s) => ({
      id:       s.id,
      status:   s.status,
      hasVideo: s.hasVideo ?? Boolean(s.videoBase64),
    })),
  });
}

export const runtime = "nodejs";
