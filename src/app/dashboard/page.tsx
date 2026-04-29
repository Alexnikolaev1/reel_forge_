import { requireAuth, logout } from "@/lib/auth";
import { getAllProjects } from "@/lib/db";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:             { label: "Черновик",     color: "text-zinc-400 bg-zinc-800" },
  generating_script: { label: "Сценарий...",  color: "text-amber-400 bg-amber-900/30" },
  generating_scenes: { label: "Сцены...",     color: "text-blue-400 bg-blue-900/30" },
  rendering:         { label: "Рендеринг...", color: "text-violet-400 bg-violet-900/30" },
  waiting_external_render: { label: "В очереди рендера", color: "text-cyan-400 bg-cyan-900/30" },
  done:              { label: "Готово",        color: "text-emerald-400 bg-emerald-900/30" },
  error:             { label: "Ошибка",        color: "text-red-400 bg-red-900/30" },
};

export default async function DashboardPage() {
  await requireAuth();
  const projects = await getAllProjects();

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800/60 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-violet-500 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <polygon points="3,13 8,2 13,13 10,13 8,7 6,13" fill="white"/>
              </svg>
            </div>
            <span className="font-semibold tracking-tight">ReelForge</span>
          </div>
          <form action={logout}>
            <button type="submit" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
              Выйти
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">Мои проекты</h1>
            <p className="text-zinc-500 text-sm mt-1">
              {projects.length} проект{projects.length === 1 ? "" : "ов"}
            </p>
          </div>
          <Link
            href="/dashboard/new"
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500
                       text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Новое видео
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="border border-dashed border-zinc-800 rounded-xl py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <polygon points="4,16 10,3 16,16 12.5,16 10,9 7.5,16" fill="#6d28d9"/>
              </svg>
            </div>
            <p className="text-zinc-400 text-sm mb-4">Пока нет проектов</p>
            <Link href="/dashboard/new" className="text-violet-400 hover:text-violet-300 text-sm transition-colors">
              Создать первое видео →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => {
              const statusInfo = STATUS_LABELS[project.status] ?? STATUS_LABELS.draft;
              return (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="block bg-zinc-900 border border-zinc-800 rounded-xl p-5
                             hover:border-zinc-700 transition-colors group"
                >
                  <div className="aspect-video bg-zinc-800 rounded-lg mb-4 flex items-center
                                  justify-center overflow-hidden">
                    {project.status === "done" && project.outputUrl ? (
                      <video src={project.outputUrl} className="w-full h-full object-cover" muted />
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
                        <polygon points="4,16 10,3 16,16 12.5,16 10,9 7.5,16" fill="#52525b"/>
                      </svg>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate group-hover:text-violet-300 transition-colors">
                        {project.title || project.topic}
                      </p>
                      <p className="text-zinc-500 text-xs mt-1">
                        {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true, locale: ru })}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs px-2 py-1 rounded-md font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-zinc-800">
                    <span className="text-zinc-600 text-xs">{project.style}</span>
                    <span className="text-zinc-700">·</span>
                    <span className="text-zinc-600 text-xs">{project.duration}с</span>
                    <span className="text-zinc-700">·</span>
                    <span className="text-zinc-600 text-xs">{project.scenes.length} сцен</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
