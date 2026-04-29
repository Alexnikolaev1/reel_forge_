"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast, Toaster } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";

type SceneStatus = "pending" | "generating_image" | "generating_video" | "done" | "error";
type ProjectStatus =
  | "draft"
  | "generating_script"
  | "generating_scenes"
  | "rendering"
  | "waiting_external_render"
  | "done"
  | "error";

interface StatusResponse {
  id: string;
  status: ProjectStatus;
  title: string;
  outputUrl?: string;
  errorMessage?: string;
  scenes: { id: string; status: SceneStatus; hasVideo: boolean }[];
}

const STATUS_MESSAGES: Record<ProjectStatus, string> = {
  draft:             "Подготовка...",
  generating_script: "✍️ Gemini пишет сценарий...",
  generating_scenes: "🖼  Генерирую визуальный ряд...",
  rendering:         "🎬 Remotion рендерит финальное видео...",
  waiting_external_render: "☁️ Ожидает внешнего рендера...",
  done:              "✅ Видео готово!",
  error:             "❌ Произошла ошибка",
};

const SCENE_STATUS_LABELS: Record<SceneStatus, string> = {
  pending:          "Ожидание",
  generating_image: "Изображение...",
  generating_video: "Видео...",
  done:             "Готово",
  error:            "Ошибка",
};

const SCENE_STATUS_COLORS: Record<SceneStatus, string> = {
  pending:          "text-zinc-500 bg-zinc-800",
  generating_image: "text-amber-400 bg-amber-900/30",
  generating_video: "text-blue-400 bg-blue-900/30",
  done:             "text-emerald-400 bg-emerald-900/30",
  error:            "text-red-400 bg-red-900/30",
};

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [data, setData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prevStatus = useRef<ProjectStatus | null>(null);
  const prevSceneStatuses = useRef<Record<string, SceneStatus>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/status`);
      if (!res.ok) throw new Error("Ошибка загрузки статуса");
      const json: StatusResponse = await res.json();
      setData(json);

      if (json.status !== prevStatus.current) {
        const msg = STATUS_MESSAGES[json.status];
        if (json.status === "done") {
          toast.success(msg, { duration: 6000 });
          if (intervalRef.current) clearInterval(intervalRef.current);
        } else if (json.status === "error") {
          toast.error(json.errorMessage ?? msg, { duration: 8000 });
          if (intervalRef.current) clearInterval(intervalRef.current);
        } else if (prevStatus.current !== null) {
          toast(msg, { duration: 3000 });
        }
        prevStatus.current = json.status;
      }

      json.scenes.forEach((scene, i) => {
        const prev = prevSceneStatuses.current[scene.id];
        if (prev !== scene.status) {
          if (scene.status === "done") {
            toast(`✅ Сцена ${i + 1} готова`, { duration: 2500 });
          } else if (scene.status === "generating_video") {
            toast(`🎞 Сцена ${i + 1}: генерирую видеоклип...`, { duration: 2000 });
          } else if (scene.status === "generating_image") {
            toast(`🖼 Сцена ${i + 1}: генерирую изображение...`, { duration: 2000 });
          } else if (scene.status === "error") {
            toast.error(`❌ Сцена ${i + 1}: ошибка`, { duration: 4000 });
          }
          prevSceneStatuses.current[scene.id] = scene.status;
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  }, [projectId]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void poll();
    }, 0);
    intervalRef.current = setInterval(() => {
      void poll();
    }, 3000);
    return () => {
      clearTimeout(timeoutId);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [poll]);

  const isDone    = data?.status === "done";
  const isError   = data?.status === "error";
  const isRunning = data && !isDone && !isError;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: { background: "#18181b", border: "1px solid #27272a", color: "#f4f4f5" },
        }}
      />

      <header className="border-b border-zinc-800/60 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <h1 className="font-semibold truncate">{data?.title || "Загрузка..."}</h1>
          {isRunning && (
            <svg className="animate-spin w-4 h-4 text-violet-400 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.3"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {error && (
          <div className="bg-red-900/20 border border-red-800/50 rounded-lg px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {isDone && data?.outputUrl && (
          <div className="space-y-4">
            <div className="aspect-video bg-black rounded-xl overflow-hidden border border-zinc-800">
              <video src={data.outputUrl} controls autoPlay className="w-full h-full" />
            </div>
            <div className="flex gap-3">
              <a
                href={data.outputUrl}
                download
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500
                           text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v8M3 6l4 4 4-4M2 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Скачать MP4
              </a>
              <Link
                href="/dashboard/new"
                className="flex items-center gap-2 border border-zinc-700 text-zinc-300
                           hover:bg-zinc-800 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                Создать ещё →
              </Link>
            </div>
          </div>
        )}

        {isRunning && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <p className="text-zinc-300 text-sm font-medium mb-1">Текущий этап</p>
            <p className="text-white font-semibold text-lg">{STATUS_MESSAGES[data.status]}</p>
            <div className="mt-4 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-500"
                style={{
                  width: data.status === "generating_scenes"
                    ? `${Math.round((data.scenes.filter(s => s.status === "done").length / Math.max(data.scenes.length, 1)) * 80)}%`
                    : data.status === "waiting_external_render" ? "95%"
                    : data.status === "rendering" ? "90%"
                    : "10%",
                }}
              />
            </div>
          </div>
        )}

        {isError && (
          <div className="bg-red-900/10 border border-red-800/40 rounded-xl p-6">
            <p className="text-red-400 font-semibold mb-2">Ошибка генерации</p>
            <p className="text-zinc-400 text-sm">{data?.errorMessage}</p>
          </div>
        )}

        {data && data.scenes.length > 0 && (
          <div>
            <h2 className="text-zinc-300 text-sm font-medium mb-4">
              Сцены — {data.scenes.length} шт.
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {data.scenes.map((scene, i) => (
                <div key={scene.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex flex-col gap-2">
                  <div className="aspect-video bg-zinc-800 rounded-md flex items-center justify-center overflow-hidden">
                    {scene.status === "done" && scene.hasVideo ? (
                      <video
                        src={`/output/${projectId}/scene-${i + 1}.mp4`}
                        className="w-full h-full object-cover"
                        muted loop autoPlay playsInline
                      />
                    ) : scene.status === "done" ? (
                      <Image
                        src={`/output/${projectId}/scene-${i + 1}.png`}
                        alt={`Сцена ${i + 1}`}
                        width={640}
                        height={360}
                        className="w-full h-full object-cover"
                      />
                    ) : scene.status === "generating_video" || scene.status === "generating_image" ? (
                      <svg className="animate-spin w-5 h-5 text-violet-400" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <span className="text-zinc-600 text-xs">{i + 1}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-xs">Сцена {i + 1}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${SCENE_STATUS_COLORS[scene.status]}`}>
                      {SCENE_STATUS_LABELS[scene.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
