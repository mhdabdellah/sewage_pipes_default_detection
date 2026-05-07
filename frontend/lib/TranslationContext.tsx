"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import en from "../locales/en.json";
import tr from "../locales/tr.json";

type Translations = typeof en;
type Language = "en" | "tr";

interface TranslationContextType {
  t: (key: string) => string;
  setLanguage: (lang: Language) => void;
  language: Language;
}

const translations: Record<Language, Translations> = { en, tr };

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem("lang") as Language;
    if (savedLang && (savedLang === "en" || savedLang === "tr")) {
      setLanguageState(savedLang);
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("lang", lang);
  };

  const t = (path: string): string => {
    const keys = path.split(".");
    let result: any = translations[language];

    for (const key of keys) {
      if (result && typeof result === "object" && key in result) {
        result = result[key];
      } else {
        return path;
      }
    }

    return typeof result === "string" ? result : path;
  };

  return (
    <TranslationContext.Provider value={{ t, setLanguage, language }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
};
