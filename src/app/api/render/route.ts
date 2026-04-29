import { NextRequest, NextResponse } from "next/server";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs/promises";
import { getProject, updateProject } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { logInfo, withTiming } from "@/lib/logger";
import type { SceneInput } from "../../../../remotion/VideoComposition";

const FPS = 30;

export async function POST(req: NextRequest) {
  const rate = checkRateLimit("render", req.headers, 3, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Слишком много запросов рендера, попробуйте позже" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)) } }
    );
  }

  const internalToken = req.headers.get("x-internal-token");
  const internalAllowed =
    Boolean(process.env.INTERNAL_API_TOKEN) &&
    internalToken === process.env.INTERNAL_API_TOKEN;
  const isAuthenticated = internalAllowed ? true : await getSession();
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { projectId } = await req.json();

  const project = await getProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Проект не найден" }, { status: 404 });
  }

  const outputDir = path.join(process.cwd(), "public", "output", projectId);
  await fs.mkdir(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, "final.mp4");
  const FRAMES_PER_SCENE = FPS * Math.max(4, Math.floor(project.duration / project.scenes.length));

  const scenes: SceneInput[] = await Promise.all(project.scenes.map(async (scene, i) => {
    const base = `/output/${projectId}`;
    const clipPath = path.join(outputDir, `scene-${i + 1}.mp4`);
    let hasVideo = false;
    try {
      await fs.access(clipPath);
      hasVideo = true;
    } catch {
      hasVideo = false;
    }
    return {
      text:             scene.text,
      videoUrl:         hasVideo ? `${base}/scene-${i + 1}.mp4` : undefined,
      imageUrl:         scene.hasImage || scene.imageBase64 ? `${base}/scene-${i + 1}.png` : undefined,
      durationInFrames: FRAMES_PER_SCENE,
    };
  }));

  const totalFrames =
    FPS * 2 +
    scenes.reduce((acc, s) => acc + s.durationInFrames, 0);

  if (process.env.ENABLE_SERVER_RENDER === "false") {
    const webhookUrl = process.env.EXTERNAL_RENDER_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        { error: "Server-side render отключен и не задан EXTERNAL_RENDER_WEBHOOK_URL" },
        { status: 503 }
      );
    }

    const callbackBaseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const callbackUrl = `${callbackBaseUrl}/api/render/callback`;
    const webhookToken = process.env.EXTERNAL_RENDER_WEBHOOK_TOKEN;

    await withTiming(
      "render.enqueue-external",
      async () => {
        const webhookRes = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {}),
          },
          body: JSON.stringify({
            projectId,
            title: project.title,
            fps: FPS,
            totalFrames,
            width: 1280,
            height: 720,
            scenes,
            callbackUrl,
          }),
        });
        if (!webhookRes.ok) {
          throw new Error(`External webhook error: ${await webhookRes.text()}`);
        }
      },
      { projectId, webhookUrl }
    );

    await updateProject(projectId, {
      status: "waiting_external_render",
      errorMessage: undefined,
    });

    return NextResponse.json(
      { queued: true, mode: "external", projectId },
      { status: 202 }
    );
  }

  logInfo("render.start", { projectId, sceneCount: scenes.length, ip: rate.ip });
  const bundled = await withTiming("render.bundle", () =>
    bundle({
      entryPoint: path.join(process.cwd(), "remotion", "index.tsx"),
      webpackOverride: (config) => config,
    })
  );

  const composition = await withTiming("render.select-composition", () =>
    selectComposition({
      serveUrl: bundled,
      id: "ReelForge",
      inputProps: { scenes, titleText: project.title },
    })
  );

  composition.durationInFrames = totalFrames;
  composition.fps = FPS;

  await withTiming("render.media", () =>
    renderMedia({
      composition,
      serveUrl:       bundled,
      codec:          "h264",
      outputLocation: outputPath,
      inputProps:     { scenes, titleText: project.title },
      onProgress: ({ progress }) => {
        const pct = Math.round(progress * 100);
        if (pct % 10 === 0) logInfo("render.progress", { projectId, pct });
      },
      concurrency: 2,
      crf: 22,
    }),
    { projectId, totalFrames }
  );

  logInfo("render.done", { projectId, outputPath });
  return NextResponse.json({ outputUrl: `/output/${projectId}/final.mp4` });
}

export const maxDuration = 300;
export const runtime = "nodejs";
