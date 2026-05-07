"use client";

import Image from "next/image";
import { useTranslation } from "@/lib/TranslationContext";
import { ChangeEvent, DragEvent, useRef, useState } from "react";

import type { PredictionResult } from "@/types";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type ImageUploaderProps = {
  onResult: (result: PredictionResult) => void;
  onLoading: (loading: boolean) => void;
};

export default function ImageUploader({ onResult, onLoading }: ImageUploaderProps): JSX.Element {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error(t("Uploader.errorPreview")));
      reader.readAsDataURL(file);
    });
  };

  const showError = (message: string): void => {
    setErrorMessage(message);
  };

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.has(file.type)) {
      return t("Uploader.errorFormat");
    }
    if (file.size > MAX_FILE_SIZE) {
      return t("Uploader.errorSize");
    }
    return null;
  };

  const selectFile = async (file: File): Promise<void> => {
    const validationError = validateFile(file);
    if (validationError) {
      showError(validationError);
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setSelectedFile(file);
      setPreviewUrl(dataUrl);
      setHasResult(false);
      setErrorMessage(null);
    } catch (err) {
      showError(err instanceof Error ? err.message : t("Uploader.errorPreview"));
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    await selectFile(file);
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>): Promise<void> => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }
    await selectFile(file);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!selectedFile || !previewUrl) {
      showError(t("Uploader.errorNoImage"));
      return;
    }

    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
      setIsSubmitting(true);
      onLoading(true);
      setErrorMessage(null);

      const response = await fetch("/api/predict", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json().catch(() => null)) as
        | Omit<PredictionResult, "timestamp" | "imagePreview">
        | { error?: string }
        | null;

      if (!response.ok || !payload || "error" in payload) {
        let errorKey = "Uploader.errorApi";
        const apiError = payload && "error" in payload ? payload.error : "";
        
        if (apiError === "FLASK_API_URL is not configured.") {
          errorKey = "Uploader.errorConfig";
        } else if (apiError === "Prediction service is unavailable.") {
          errorKey = "Uploader.errorService";
        }
        
        throw new Error(t(errorKey));
      }

      const predictionData = payload as Omit<PredictionResult, "timestamp" | "imagePreview">;

      const result: PredictionResult = {
        ...predictionData,
        timestamp: new Date().toISOString(),
        imagePreview: previewUrl
      };

      onResult(result);
      setHasResult(true);
    } catch (error) {
      showError(error instanceof Error ? error.message : t("Uploader.errorApi"));
    } finally {
      setIsSubmitting(false);
      onLoading(false);
    }
  };

  const handleReset = (): void => {
    setSelectedFile(null);
    setPreviewUrl("");
    setHasResult(false);
    setErrorMessage(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <section className="relative rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg transition-all duration-300 dark:bg-slate-900">
      {errorMessage ? (
        <div
          role="alert"
          className="absolute right-4 top-4 rounded-xl border border-red-500/40 bg-red-500/15 px-4 py-3 text-sm text-red-200 shadow-lg transition-all duration-300"
        >
          {errorMessage}
        </div>
      ) : null}

      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.35em] text-teal-300">{t("Uploader.title")}</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-50">{t("Uploader.heading")}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">{t("Uploader.description")}</p>
      </div>

      <input
        ref={inputRef}
        id="pipevision-image-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        aria-label={t("Uploader.selectFile")}
        onChange={(event) => {
          void handleFileChange(event);
        }}
      />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          void handleDrop(event);
        }}
        className={`group flex min-h-[320px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-300 ${
          isDragging
            ? "border-teal-400 bg-teal-500/10 shadow-[0_0_45px_rgba(20,184,166,0.25)]"
            : "border-teal-500/60 bg-slate-950/40 hover:border-teal-400 hover:bg-slate-900/70"
        }`}
      >
        {previewUrl ? (
          <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800">
            <Image
              src={previewUrl}
              alt={t("Uploader.dropImage")}
              width={800}
              height={320}
              className="h-[320px] w-full object-cover transition-all duration-300"
              unoptimized
            />
            {isSubmitting ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70">
                <div className="flex items-center gap-3 rounded-full border border-teal-500/40 bg-slate-950/80 px-5 py-3 text-sm text-teal-200 shadow-glow">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
                  {t("Uploader.analyzing")}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-teal-500/30 bg-teal-500/10 text-teal-300 transition-all duration-300 group-hover:scale-105">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-10 w-10"
                aria-hidden="true"
              >
                <path d="M12 16V4" strokeLinecap="round" />
                <path d="m7 9 5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 16.5v1a2.5 2.5 0 0 0 2.5 2.5h11a2.5 2.5 0 0 0 2.5-2.5v-1" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-lg font-medium text-slate-100">{t("Uploader.dropImage")}</p>
            <p className="mt-2 text-sm text-slate-400">{t("Uploader.orUseButton")}</p>
          </>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-full border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-medium text-slate-200 transition-all duration-300 hover:border-teal-500 hover:text-teal-300"
        >
          {t("Uploader.selectFile")}
        </button>
        <button
          type="button"
          onClick={() => {
            void handleSubmit();
          }}
          disabled={!selectedFile || isSubmitting}
          className="rounded-full bg-teal-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-all duration-300 hover:bg-teal-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {t("Uploader.analyzeImage")}
        </button>
        {hasResult ? (
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full border border-slate-700 px-5 py-3 text-sm font-medium text-slate-300 transition-all duration-300 hover:border-slate-500 hover:text-slate-100"
          >
            {t("Uploader.reset")}
          </button>
        ) : null}
      </div>
    </section>
  );
}
