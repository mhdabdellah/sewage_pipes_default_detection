import type { PredictionResult } from "@/types";

export const CLASS_NAMES = ["Root Intrusion", "Sediment Blockage", "Structural Crack"];
export const HISTORY_STORAGE_KEY = "pipevision_history";

type ClassMeta = {
  badgeLabelKey: string;
  badgeClassName: string;
  recommendationKey: string;
};

const CLASS_META: Record<number, ClassMeta> = {
  0: {
    badgeLabelKey: "Root Intrusion",
    badgeClassName: "bg-red-500 text-white",
    recommendationKey: "recommendationRoot"
  },
  1: {
    badgeLabelKey: "Sediment Blockage",
    badgeClassName: "bg-yellow-500 text-slate-950",
    recommendationKey: "recommendationSediment"
  },
  2: {
    badgeLabelKey: "Structural Crack",
    badgeClassName: "bg-blue-500 text-white",
    recommendationKey: "recommendationCrack"
  }
};

export function getClassMeta(classId: number): ClassMeta {
  return (
    CLASS_META[classId] ?? {
      badgeLabelKey: "unknownClass",
      badgeClassName: "bg-slate-600 text-white",
      recommendationKey: "recommendationUnknown"
    }
  );
}

export function getConfidenceLabelKey(confidence: number): string {
  if (confidence > 0.9) return "highConfidence";
  if (confidence >= 0.7) return "mediumConfidence";
  return "lowConfidence";
}

export function formatConfidence(confidence: number): string {
  return `${(confidence * 100).toFixed(1)}%`;
}

export function formatTimestamp(timestamp: string, locale: string = "en"): string {
  const languageTag = locale === "tr" ? "tr-TR" : "en-US";
  return new Intl.DateTimeFormat(languageTag, {
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
