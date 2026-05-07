"use client";

import { useTranslation } from "@/lib/TranslationContext";

export default function LanguageSwitcher() {
  const { setLanguage, language } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setLanguage("en")}
        className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
          language === "en"
            ? "bg-teal-500 text-slate-950"
            : "border border-slate-700 bg-slate-900 text-slate-200 hover:border-teal-500 hover:text-teal-300"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage("tr")}
        className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
          language === "tr"
            ? "bg-teal-500 text-slate-950"
            : "border border-slate-700 bg-slate-900 text-slate-200 hover:border-teal-500 hover:text-teal-300"
        }`}
      >
        TR
      </button>
    </div>
  );
}
