import { render, screen } from "@testing-library/react";

import ResultCard from "@/components/ResultCard";
import type { PredictionResult } from "@/types";

const baseResult: PredictionResult = {
  class_name: "Root Intrusion",
  class_id: 0,
  confidence: 0.932,
  probabilities: [0.932, 0.041, 0.027],
  timestamp: "2026-04-29T20:00:00.000Z",
  imagePreview: "data:image/mock;base64,preview"
};

describe("ResultCard", () => {
  it("renders class_name text", () => {
    render(<ResultCard result={baseResult} />);
    expect(screen.getByText("Root Intrusion")).toBeInTheDocument();
  });

  it.each([
    { classId: 0, label: "Kok Girisi", className: "bg-red-500", title: "Root Intrusion" },
    { classId: 1, label: "Tortu Tikanmasi", className: "bg-yellow-500", title: "Sediment Blockage" },
    { classId: 2, label: "Yapisal Catlakar", className: "bg-blue-500", title: "Structural Cracks" }
  ])("renders correct badge colour class for class_id $classId", ({ classId, label, className, title }) => {
    render(<ResultCard result={{ ...baseResult, class_id: classId, class_name: title }} />);
    expect(screen.getByText(label)).toHaveClass(className);
  });

  it("renders confidence as percentage string", () => {
    render(<ResultCard result={baseResult} />);
    expect(screen.getByText("93.2%")).toBeInTheDocument();
  });

  it.each([
    { classId: 0, className: "Root Intrusion", recommendation: "30 gun icinde kok kesme islemini planlayin." },
    { classId: 1, className: "Sediment Blockage", recommendation: "14 gun icinde yuksek basincli temizlik planlayin." },
    { classId: 2, className: "Structural Cracks", recommendation: "Acil yapisal degerlendirme gereklidir." }
  ])("renders recommendation text matching class_id $classId", ({ classId, className, recommendation }) => {
    render(<ResultCard result={{ ...baseResult, class_id: classId, class_name: className }} />);
    expect(screen.getByText(recommendation)).toBeInTheDocument();
  });
});
