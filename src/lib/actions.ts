"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createProject, updateProject, updateScene, getProject } from "@/lib/db";
import { generateSceneImage, generateSceneVideo } from "@/lib/hf-generate";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface ScriptScene {
  text: string;
  visualPrompt: string;
}

interface GeneratedScript {
  title: string;
  description: string;
  scenes: ScriptScene[];
}

export async function generateScript(
  topic: string,
  style: string,
  duration: number
): Promise<{ script: GeneratedScript; projectId: string }> {
  console.log(`[1/5] 🎬 Генерирую сценарий: "${topic}" | стиль: ${style} | ${duration}с`);

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
  const sceneCount = Math.max(3, Math.floor(duration / 10));

  const prompt = `Ты — креативный режиссер. На основе запроса пользователя создай сценарий видео.

Тема: "${topic}"
Визуальный стиль: ${style}
Длительность: ${duration} секунд
Количество сцен: ${sceneCount}

Ответь ТОЛЬКО валидным JSON без каких-либо пояснений, markdown-блоков и лишнего текста.
Структура ответа:
{
  "title": "Заголовок видео",
  "description": "Краткое описание (1-2 предложения)",
  "scenes": [
    {
      "text": "Текст для озвучки этой сцены (на русском языке)",
      "visualPrompt": "Detailed English prompt for AI image generation, ${style} style, cinematic, high quality"
    }
  ]
}

Важно:
- text — живой, эмоциональный текст на русском
- visualPrompt — детальный английский промт для Stable Diffusion / FLUX
- Каждый visualPrompt должен быть самодостаточным (не ссылаться на предыдущие сцены)`;

  const result = await model.generateContent(prompt);
  const rawText = result.response.text().trim();
  const jsonText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  let script: GeneratedScript;
  try {
    script = JSON.parse(jsonText);
  } catch {
    throw new Error(`Gemini вернул невалидный JSON: ${jsonText.slice(0, 200)}`);
  }

  console.log(`[1/5] ✅ Сценарий готов: "${script.title}", ${script.scenes.length} сцен`);

  const project = await createProject({ topic, style, duration });
  await updateProject(project.id, {
    title: script.title,
    description: script.description,
    status: "generating_scenes",
    scenes: script.scenes.map((s) => ({
      id: randomUUID(),
      text: s.text,
      visualPrompt: s.visualPrompt,
      status: "pending" as const,
    })),
  });

  return { script, projectId: project.id };
}

export async function createVideoProject(projectId: string): Promise<void> {
  console.log(`\n🚀 Запускаю конвейер для проекта: ${projectId}`);

  const project = await getProject(projectId);
  if (!project) throw new Error("Проект не найден");

  const enableSceneVideo = process.env.ENABLE_SCENE_VIDEO === "true";

  const outputDir = path.join(process.cwd(), "public", "output", projectId);
  await fs.mkdir(outputDir, { recursive: true });

  for (let i = 0; i < project.scenes.length; i++) {
    const scene = project.scenes[i];
    console.log(`\n[2/5] 🖼  Сцена ${i + 1}/${project.scenes.length}: генерирую изображение...`);

    await updateScene(projectId, scene.id, { status: "generating_image" });

    let imageBase64: string;
    try {
      imageBase64 = await generateSceneImage(scene.visualPrompt);
      console.log(`[2/5] ✅ Изображение сцены ${i + 1} готово`);
    } catch (err) {
      console.error(`[2/5] ❌ Ошибка изображения сцены ${i + 1}:`, err);
      await updateScene(projectId, scene.id, { status: "error" });
      continue;
    }

    const imgPath = path.join(outputDir, `scene-${i + 1}.png`);
    await fs.writeFile(imgPath, Buffer.from(imageBase64, "base64"));

    if (!enableSceneVideo) {
      console.log(`[3/5] ⏭  Сцена ${i + 1}: режим монтажа (без отдельного видеоклипа на сцену)`);
      await updateScene(projectId, scene.id, { status: "done", hasImage: true, hasVideo: false });
      continue;
    }

    console.log(`[3/5] 🎞  Сцена ${i + 1}: генерирую видеоклип...`);
    await updateScene(projectId, scene.id, { status: "generating_video", hasImage: true });

    try {
      const videoBase64 = await generateSceneVideo(imageBase64);
      console.log(`[3/5] ✅ Видеоклип сцены ${i + 1} готов`);
      const clipPath = path.join(outputDir, `scene-${i + 1}.mp4`);
      await fs.writeFile(clipPath, Buffer.from(videoBase64, "base64"));
      await updateScene(projectId, scene.id, { status: "done", hasVideo: true });
    } catch (err) {
      console.error(`[3/5] ❌ Ошибка видео сцены ${i + 1}:`, err);
      // Fallback to still image in the final render instead of writing invalid MP4 bytes.
      await updateScene(projectId, scene.id, { status: "done", hasVideo: false });
    }
  }

  console.log(`\n[4/5] 🎬 Запускаю финальный рендеринг...`);
  await updateProject(projectId, { status: "rendering" });

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/render`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-token": process.env.INTERNAL_API_TOKEN ?? "",
        },
        body: JSON.stringify({ projectId }),
      }
    );

    if (res.status === 202) {
      await updateProject(projectId, { status: "waiting_external_render" });
      console.log(`\n[5/5] ⏳ Проект передан во внешний рендер`);
      return;
    }

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`Render API: ${msg}`);
    }

    const { outputUrl } = await res.json();
    console.log(`\n[5/5] ✅ Готово! Видео: ${outputUrl}`);
    await updateProject(projectId, { status: "done", outputUrl });
  } catch (err) {
    console.error("[4/5] ❌ Ошибка рендеринга:", err);
    const rawMessage = err instanceof Error ? err.message : String(err);
    const isRenderUnavailable =
      rawMessage.includes("Server-side render отключен") ||
      rawMessage.includes("EXTERNAL_RENDER_WEBHOOK_URL") ||
      rawMessage.includes("FUNCTION_INVOCATION_TIMEOUT") ||
      rawMessage.includes("504");
    const userFriendlyMessage = isRenderUnavailable
      ? "Финальный рендер не завершился (лимит serverless). Попробуй проект на 15-30с и повтори запуск."
      : rawMessage;
    await updateProject(projectId, {
      status: "error",
      errorMessage: userFriendlyMessage,
    });
    throw err;
  }
}
