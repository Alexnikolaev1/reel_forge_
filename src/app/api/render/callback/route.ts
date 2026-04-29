import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/db";
import { logError, logInfo } from "@/lib/logger";
import { z } from "zod";

const callbackSchema = z.object({
  projectId: z.string().uuid(),
  outputUrl: z.string().min(1).optional(),
  error: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-render-callback-secret");
  if (!process.env.RENDER_CALLBACK_SECRET || secret !== process.env.RENDER_CALLBACK_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = callbackSchema.parse(await req.json());
    const project = await getProject(body.projectId);
    if (!project) {
      return NextResponse.json({ error: "Проект не найден" }, { status: 404 });
    }

    if (body.error) {
      await updateProject(body.projectId, {
        status: "error",
        errorMessage: body.error,
      });
      logError("render.callback.error", { projectId: body.projectId, error: body.error });
      return NextResponse.json({ ok: true });
    }

    if (!body.outputUrl) {
      return NextResponse.json({ error: "outputUrl обязателен при успешном рендере" }, { status: 400 });
    }

    await updateProject(body.projectId, {
      status: "done",
      outputUrl: body.outputUrl,
      errorMessage: undefined,
    });
    logInfo("render.callback.done", { projectId: body.projectId, outputUrl: body.outputUrl });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ошибка callback" },
      { status: 400 }
    );
  }
}

export const runtime = "nodejs";
