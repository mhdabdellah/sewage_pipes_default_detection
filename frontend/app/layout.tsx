import { LanguageProvider } from "@/lib/TranslationContext";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";

import Navbar from "@/components/Navbar";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const themeScript = `
  (() => {
    try {
      const savedTheme = localStorage.getItem("pipevision_theme");
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      const theme = savedTheme ?? systemTheme;
      document.documentElement.classList.toggle("dark", theme === "dark");
    } catch (error) {
      document.documentElement.classList.add("dark");
    }
  })();
`;

export const metadata: Metadata = {
  title: "PipeVision",
  description: "Sewer pipe defect detection dashboard powered by RegNetPlus."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-950 text-slate-50 transition-all duration-300`}>
        <LanguageProvider>
          <Script id="pipevision-theme" strategy="beforeInteractive">
            {themeScript}
          </Script>
          <div className="relative min-h-screen">
            <div className="absolute inset-x-0 top-0 h-80 bg-mesh-radial opacity-70" />
            <div className="relative z-10">
              <Navbar />
              <main className="mx-auto w-full max-w-7xl px-6 py-10">{children}</main>
            </div>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
