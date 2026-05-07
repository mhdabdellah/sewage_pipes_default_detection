"use client";

import { startTransition, useState } from "react";

import ConfidenceChart from "@/components/ConfidenceChart";
import ImageUploader from "@/components/ImageUploader";
import ResultCard from "@/components/ResultCard";
import { CLASS_NAMES } from "@/lib/prediction";
import type { PredictionResult } from "@/types";

export default function DashboardPage(): JSX.Element {
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="space-y-8">
      <section className="grid gap-8 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg transition-all duration-300">
            <p className="text-sm uppercase tracking-[0.35em] text-teal-300">PipeVision Dashboard</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-semibold text-slate-50">Kanal hattindaki kusurlari tek goruntude tespit edin</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              RegNetPlus tabanli model, kok girisi, tortu tikanmasi ve yapisal catlaklari hizli sekilde siniflandirir.
            </p>
          </div>

          <ImageUploader
            onLoading={setIsLoading}
            onResult={(nextResult) => {
              startTransition(() => setResult(nextResult));
            }}
          />
        </div>

        <div className="space-y-6">
          {result ? (
            <>
              <ResultCard result={result} />
              <ConfidenceChart probabilities={result.probabilities} classNames={CLASS_NAMES} />
            </>
          ) : (
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg transition-all duration-300">
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-10 text-center">
                <p className="text-sm uppercase tracking-[0.35em] text-teal-300">Hazir Bekliyor</p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-50">Sonuc karti burada gorunecek</h2>
                <p className="mt-4 text-sm leading-7 text-slate-400">
                  Bir boru goruntusu yukleyin; tahmin sonucu, guven seviyesi ve sinif olasiliklari otomatik olarak bu panelde acilacak.
                </p>
                <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 text-left">
                  <p className="text-sm text-slate-300">
                    {isLoading ? "Analiz devam ediyor. Sonuc paneli guncellenmek uzere." : "Analiz baslatildiginda grafik ve aksiyon tavsiyesi hazirlanacak."}
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}
