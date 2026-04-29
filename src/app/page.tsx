import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { login } from "@/lib/auth";

interface LoginPageProps {
  searchParams?: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const isAuth = await getSession();
  if (isAuth) redirect("/dashboard");
  const params = searchParams ? await searchParams : {};
  const hasInvalidPassword = params.error === "invalid_password";

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <polygon points="3,13 8,2 13,13 10,13 8,7 6,13" fill="white"/>
              </svg>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">ReelForge</span>
          </div>
          <p className="text-zinc-400 text-sm">AI-фабрика видеоконтента</p>
        </div>

        <form action={login} className="space-y-4">
          {hasInvalidPassword && (
            <div className="bg-red-900/20 border border-red-800/50 rounded-lg px-4 py-3 text-red-400 text-sm">
              Неверный пароль
            </div>
          )}
          <div>
            <label className="block text-zinc-400 text-sm mb-2">Пароль</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3
                         text-white placeholder-zinc-600 text-sm
                         focus:outline-none focus:border-violet-500 transition-colors"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-violet-600 hover:bg-violet-500 text-white
                       rounded-lg py-3 text-sm font-medium transition-colors"
          >
            Войти в систему
          </button>
        </form>

        <p className="text-center text-zinc-600 text-xs mt-6">
          Пароль по умолчанию: <code className="text-zinc-400">reelforge2024</code>
        </p>
      </div>
    </main>
  );
}
