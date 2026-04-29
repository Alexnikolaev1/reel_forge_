import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "ReelForge — AI Video Factory",
  description: "Генерация видеоконтента с помощью Gemini + Hugging Face + Remotion",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${inter.className} bg-zinc-950 antialiased`}>
        {children}
      </body>
    </html>
  );
}
