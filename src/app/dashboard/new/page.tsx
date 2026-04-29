"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const VIDEO_STYLES = [
  { id: "cinematic",   label: "Кинематографичный", desc: "Эпичные кадры, глубокие тени" },
  { id: "documentary", label: "Документальный",    desc: "Реализм, фактурность" },
  { id: "animated",    label: "Анимированный",     desc: "Яркие цвета, динамика" },
  { id: "minimalist",  label: "Минималистичный",   desc: "Чистые линии, белое пространство" },
  { id: "retro",       label: "Ретро",             desc: "Плёнка, зерно, ностальгия" },
];

const DURATIONS = [15, 30, 45, 60];

type Step = 1 | 2 | 3;

interface ScriptData {
  title: string;
  description: string;
  scenes: { text: string; visualPrompt: string }[];
}

async function getApiErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.error === "string" && data.error.trim().length > 0) {
      return data.error;
    }
  } catch {
    // Ignore invalid JSON and use fallback.
  }
  return fallback;
}

export default function NewVideoPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [duration, setDuration] = useState(30);

  const [script, setScript] = useState<ScriptData | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  async function handleGenerateScript() {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, style, duration }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "Ошибка генерации сценария"));
      const data = await res.json();
      setScript(data.script);
      setProjectId(data.projectId);
      setStep(2);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка генерации сценария");
    } finally {
      setLoading(false);
    }
  }

  async function handleStartGeneration() {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/start-generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "Ошибка запуска генерации"));
      setStep(3);
      setTimeout(() => router.push(`/dashboard/projects/${projectId}`), 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка запуска генерации");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800/60 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <h1 className="font-semibold">Новое видео</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center gap-2 mb-10">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium
                transition-colors ${step === s
                  ? "bg-violet-500 text-white"
                  : step > s
                  ? "bg-violet-900/50 text-violet-400"
                  : "bg-zinc-800 text-zinc-500"
              }`}>
                {step > s ? "✓" : s}
              </div>
              <span className={`text-xs ${step === s ? "text-white" : "text-zinc-600"}`}>
                {s === 1 ? "Параметры" : s === 2 ? "Сценарий" : "Запуск"}
              </span>
              {s < 3 && <div className="w-8 h-px bg-zinc-800 mx-1" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-800/50 rounded-lg px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-zinc-300 text-sm font-medium mb-2">Тема видео</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Например: Как работает квантовый компьютер, объяснение для новичков"
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3
                           text-white placeholder-zinc-600 text-sm resize-none
                           focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-zinc-300 text-sm font-medium mb-3">Визуальный стиль</label>
              <div className="grid grid-cols-1 gap-2">
                {VIDEO_STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg border
                      text-left transition-colors ${
                        style === s.id
                          ? "border-violet-500 bg-violet-900/20"
                          : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                      }`}
                  >
                    <span className="text-sm font-medium">{s.label}</span>
                    <span className="text-zinc-500 text-xs">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 text-sm font-medium mb-3">Длительность</label>
              <div className="flex gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      duration === d
                        ? "border-violet-500 bg-violet-900/20 text-violet-300"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    {d}с
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateScript}
              disabled={!topic.trim() || loading}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800
                         disabled:text-zinc-600 text-white py-3 rounded-lg text-sm
                         font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Генерирую сценарий...
                </>
              ) : "Создать сценарий →"}
            </button>
          </div>
        )}

        {step === 2 && script && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h2 className="font-semibold text-lg mb-1">{script.title}</h2>
              <p className="text-zinc-400 text-sm">{script.description}</p>
            </div>

            <div>
              <h3 className="text-zinc-300 text-sm font-medium mb-3">
                Раскадровка — {script.scenes.length} сцен
              </h3>
              <div className="space-y-3">
                {script.scenes.map((scene, i) => (
                  <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-violet-400 font-mono font-medium">СЦЕНА {i + 1}</span>
                    </div>
                    <p className="text-sm text-white mb-2">{scene.text}</p>
                    <p className="text-xs text-zinc-500 font-mono">🎨 {scene.visualPrompt}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-zinc-700 text-zinc-300 hover:bg-zinc-800
                           py-3 rounded-lg text-sm font-medium transition-colors"
              >
                ← Изменить параметры
              </button>
              <button
                onClick={handleStartGeneration}
                disabled={loading}
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white
                           py-3 rounded-lg text-sm font-medium transition-colors
                           flex items-center justify-center gap-2"
              >
                {loading ? "Запускаю..." : "Запустить генерацию →"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-violet-900/30 border border-violet-700/50
                            flex items-center justify-center mx-auto mb-4">
              <svg className="animate-spin w-6 h-6 text-violet-400" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h2 className="font-semibold text-lg mb-2">Генерация запущена</h2>
            <p className="text-zinc-400 text-sm">Переадресую на страницу проекта...</p>
          </div>
        )}
      </main>
    </div>
  );
}
