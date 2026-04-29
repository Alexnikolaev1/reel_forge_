"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "reel_session";
const DEMO_PASSWORD = process.env.ADMIN_PASSWORD || "reelforge2024";

export async function login(formData: FormData) {
  const password = formData.get("password") as string;

  if (password !== DEMO_PASSWORD) {
    redirect("/?error=invalid_password");
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  redirect("/dashboard");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/");
}

export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.has(SESSION_COOKIE);
}

export async function requireAuth() {
  const isAuthenticated = await getSession();
  if (!isAuthenticated) {
    redirect("/");
  }
}
