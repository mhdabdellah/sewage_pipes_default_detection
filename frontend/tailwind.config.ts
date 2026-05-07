import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./types/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 0 1px rgba(20, 184, 166, 0.3), 0 20px 60px rgba(15, 23, 42, 0.45)"
      },
      backgroundImage: {
        "mesh-radial":
          "radial-gradient(circle at top left, rgba(20, 184, 166, 0.16), transparent 35%), radial-gradient(circle at top right, rgba(59, 130, 246, 0.18), transparent 30%), linear-gradient(180deg, rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0.75))"
      }
    }
  },
  plugins: []
};

export default config;
