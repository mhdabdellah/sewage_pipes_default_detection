import type { PredictionResult } from "@/types";

export const CLASS_NAMES = ["Root Intrusion", "Sediment Blockage", "Structural Cracks"];
export const HISTORY_STORAGE_KEY = "pipevision_history";

type ClassMeta = {
  badgeLabel: string;
  badgeClassName: string;
  recommendation: string;
};

const CLASS_META: Record<number, ClassMeta> = {
  0: {
    badgeLabel: "Kok Girisi",
    badgeClassName: "bg-red-500 text-white",
    recommendation: "30 gun icinde kok kesme islemini planlayin."
  },
  1: {
    badgeLabel: "Tortu Tikanmasi",
    badgeClassName: "bg-yellow-500 text-slate-950",
    recommendation: "14 gun icinde yuksek basincli temizlik planlayin."
  },
  2: {
    badgeLabel: "Yapisal Catlakar",
    badgeClassName: "bg-blue-500 text-white",
    recommendation: "Acil yapisal degerlendirme gereklidir."
  }
};

export function getClassMeta(classId: number): ClassMeta {
  return (
    CLASS_META[classId] ?? {
      badgeLabel: "Bilinmeyen Sinif",
      badgeClassName: "bg-slate-600 text-white",
      recommendation: "Sonucu manuel olarak gozden gecirin."
    }
  );
}

export function getConfidenceLabel(confidence: number): string {
  if (confidence > 0.9) {
    return "Yuksek Guven";
  }
  if (confidence >= 0.7) {
    return "Orta Guven";
  }
  return "Dusuk Guven";
}

export function formatConfidence(confidence: number): string {
  return `${(confidence * 100).toFixed(1)}%`;
}

export function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp));
}

export function readPredictionHistory(): PredictionResult[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!rawHistory) {
      return [];
    }

    const parsedHistory = JSON.parse(rawHistory);
    return Array.isArray(parsedHistory) ? (parsedHistory as PredictionResult[]) : [];
  } catch {
    return [];
  }
}

export function savePredictionToHistory(result: PredictionResult): void {
  if (typeof window === "undefined") {
    return;
  }

  const currentHistory = readPredictionHistory();
  const nextHistory = [result, ...currentHistory];
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
}
