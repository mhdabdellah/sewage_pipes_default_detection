"use client";

import { useTranslation } from "@/lib/TranslationContext";
import { useEffect, useState } from "react";

type ConfidenceChartProps = {
  probabilities: number[];
  classNames: string[];
};

export default function ConfidenceChart({ probabilities, classNames }: ConfidenceChartProps): JSX.Element {
  const { t } = useTranslation();
  const [animateBars, setAnimateBars] = useState(false);
  const winningIndex = probabilities.indexOf(Math.max(...probabilities));

  useEffect(() => {
    setAnimateBars(false);
    const timer = window.setTimeout(() => setAnimateBars(true), 50);
    return () => window.clearTimeout(timer);
  }, [probabilities]);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg transition-all duration-300 dark:bg-slate-900">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.35em] text-teal-300">{t("Prediction.classDistribution")}</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-50">{t("Prediction.confidenceDistribution")}</h2>
      </div>

      <div className="space-y-5">
        {classNames.map((classNameKey, index) => {
          const percentage = Math.max(0, Math.min(100, probabilities[index] * 100));
          const isWinner = index === winningIndex;

          return (
            <div key={classNameKey} className="space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>{t(`Prediction.${classNameKey}`)}</span>
                <span className="font-mono">{percentage.toFixed(1)}%</span>
              </div>
              <div
                role="img"
                aria-label={`${t(`Prediction.${classNameKey}`)} ${t("Prediction.probabilityBar")}`}
                className="h-4 overflow-hidden rounded-full bg-slate-800"
              >
                <div
                  className={`h-full rounded-full transition-all duration-[600ms] ease-out ${
                    isWinner ? "bg-teal-500" : "bg-slate-600"
                  }`}
                  style={{ width: animateBars ? `${percentage}%` : "0%" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
