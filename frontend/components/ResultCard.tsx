"use client";

import { useTranslation } from "@/lib/TranslationContext";
import { useState } from "react";

import { formatConfidence, formatTimestamp, getClassMeta, getConfidenceLabelKey, savePredictionToHistory } from "@/lib/prediction";
import type { PredictionResult } from "@/types";

type ResultCardProps = {
  result: PredictionResult;
};

export default function ResultCard({ result }: ResultCardProps): JSX.Element {
  const { t, language } = useTranslation();
  const [saved, setSaved] = useState(false);
  const classMeta = getClassMeta(result.class_id);

  const handleSave = (): void => {
    savePredictionToHistory(result);
    setSaved(true);
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg transition-all duration-300 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-teal-300">{t("Prediction.detectionResult")}</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-50">{t(`Prediction.${result.class_name}`)}</h2>
        </div>
        <span className={`rounded-full px-4 py-2 text-sm font-semibold ${classMeta.badgeClassName}`}>
          {t(`Prediction.${classMeta.badgeLabelKey}`)}
        </span>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{t("Prediction.confidenceScore")}</p>
          <p className="mt-4 font-mono text-5xl font-semibold text-teal-300">{formatConfidence(result.confidence)}</p>
          <p className="mt-3 text-sm text-slate-300">{t(`Prediction.${getConfidenceLabelKey(result.confidence)}`)}</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{t("Prediction.recommendedAction")}</p>
          <p className="mt-4 text-base leading-7 text-slate-200">{t(`Prediction.${classMeta.recommendationKey}`)}</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{t("Prediction.analysisTime")}</p>
        <p className="mt-2 text-sm text-slate-200">{formatTimestamp(result.timestamp, language)}</p>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-full bg-teal-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-all duration-300 hover:bg-teal-400"
        >
          {t("Prediction.saveToHistory")}
        </button>
        <span className="text-sm text-slate-400" aria-live="polite">
          {saved ? t("Prediction.savedToHistory") : t("Prediction.saveForLater")}
        </span>
      </div>
    </section>
  );
}
