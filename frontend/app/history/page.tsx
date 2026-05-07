"use client";

import { useEffect, useState } from "react";

import { formatConfidence, formatTimestamp, getClassMeta, readPredictionHistory } from "@/lib/prediction";
import type { PredictionResult } from "@/types";

const ITEMS_PER_PAGE = 10;

export default function HistoryPage(): JSX.Element {
  const [history, setHistory] = useState<PredictionResult[]>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setHistory(readPredictionHistory());
  }, []);

  const totalPages = Math.max(1, Math.ceil(history.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const visibleResults = history.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg transition-all duration-300">
        <p className="text-sm uppercase tracking-[0.35em] text-teal-300">Arsiv</p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-50">Analiz Gecmisi</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
          Tarayiciya kaydedilen tahminleri zaman sirali olarak inceleyin ve onceki saha goruntuleriyle karsilastirin.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg transition-all duration-300">
        {history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-10 text-center">
            <p className="text-lg font-medium text-slate-100">Kayitli analiz bulunamadi.</p>
            <p className="mt-3 text-sm text-slate-400">Dashboard ekranindan bir tahmin kaydettiginizde burada listelenecek.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                <thead>
                  <tr className="text-slate-400">
                    <th className="px-3 py-4 font-medium">Onizleme</th>
                    <th className="px-3 py-4 font-medium">Sinif</th>
                    <th className="px-3 py-4 font-medium">Guven</th>
                    <th className="px-3 py-4 font-medium">Zaman</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {visibleResults.map((result) => {
                    const classMeta = getClassMeta(result.class_id);
                    return (
                      <tr key={`${result.timestamp}-${result.class_name}`} className="transition-all duration-300 hover:bg-slate-950/40">
                        <td className="px-3 py-4">
                          <img
                            src={result.imagePreview}
                            alt={`${result.class_name} onizlemesi`}
                            className="h-16 w-24 rounded-xl object-cover"
                          />
                        </td>
                        <td className="px-3 py-4">
                          <div className="space-y-2">
                            <p className="font-medium text-slate-100">{result.class_name}</p>
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classMeta.badgeClassName}`}>
                              {classMeta.badgeLabel}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-4 font-mono text-teal-300">{formatConfidence(result.confidence)}</td>
                        <td className="px-3 py-4 text-slate-300">{formatTimestamp(result.timestamp)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Sayfa {currentPage} / {totalPages}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPage((previousPage) => Math.max(previousPage - 1, 1))}
                  disabled={currentPage === 1}
                  className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition-all duration-300 hover:border-teal-500 hover:text-teal-300 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
                >
                  Onceki
                </button>
                <button
                  type="button"
                  onClick={() => setPage((previousPage) => Math.min(previousPage + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition-all duration-300 hover:border-teal-500 hover:text-teal-300 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
                >
                  Sonraki
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
