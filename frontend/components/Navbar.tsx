"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/TranslationContext";
import LanguageSwitcher from "./LanguageSwitcher";

const THEME_STORAGE_KEY = "pipevision_theme";

function applyTheme(theme: "dark" | "light"): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export default function Navbar(): JSX.Element {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) as "dark" | "light" | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const initialTheme = savedTheme ?? systemTheme;
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const toggleTheme = (): void => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur dark:bg-slate-950/85 dark:text-slate-50">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 transition-all duration-300">
        <Link href="/" className="group flex items-center gap-3 text-slate-50 transition-all duration-300">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-500/40 bg-teal-500/10 shadow-glow transition-all duration-300 group-hover:scale-105">
            <svg
              aria-hidden="true"
              viewBox="0 0 64 64"
              className="h-7 w-7 text-teal-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 14h16v12c0 6.6 5.4 12 12 12h4" />
              <path d="M48 26v24H32" />
              <circle cx="48" cy="26" r="4" fill="currentColor" stroke="none" />
              <circle cx="32" cy="50" r="4" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span>
            <span className="block text-lg font-semibold tracking-[0.18em] text-slate-100 uppercase">{t("Common.brandName")}</span>
            <span className="block text-xs uppercase tracking-[0.4em] text-slate-400">{t("Common.brandSub")}</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                pathname === "/" ? "bg-teal-500 text-slate-950" : "text-slate-300 hover:bg-slate-800 hover:text-teal-300"
              }`}
            >
              {t("Common.dashboard")}
            </Link>
            <Link
              href="/history"
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                pathname === "/history"
                  ? "bg-teal-500 text-slate-950"
                  : "text-slate-300 hover:bg-slate-800 hover:text-teal-300"
              }`}
            >
              {t("Common.history")}
            </Link>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          <LanguageSwitcher />

          <div className="h-6 w-px bg-slate-800" />

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={t("Common.changeTheme")}
            className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition-all duration-300 hover:border-teal-500 hover:text-teal-300 dark:border-slate-700 dark:bg-slate-900"
          >
            {theme === "dark" ? t("Common.lightMode") : t("Common.darkMode")}
          </button>
        </div>
      </nav>
    </header>
  );
}
