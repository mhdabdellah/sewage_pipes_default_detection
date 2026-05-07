import { render, screen } from "@testing-library/react";

import ConfidenceChart from "@/components/ConfidenceChart";

describe("ConfidenceChart", () => {
  it("renders three bars", () => {
    render(
      <ConfidenceChart
        probabilities={[0.2, 0.5, 0.3]}
        classNames={["Root Intrusion", "Sediment Blockage", "Structural Cracks"]}
      />
    );

    expect(screen.getAllByRole("img")).toHaveLength(3);
  });

  it("each bar has aria-label containing the class name", () => {
    render(
      <ConfidenceChart
        probabilities={[0.2, 0.5, 0.3]}
        classNames={["Root Intrusion", "Sediment Blockage", "Structural Cracks"]}
      />
    );

    expect(screen.getByLabelText(/Root Intrusion/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sediment Blockage/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Structural Cracks/i)).toBeInTheDocument();
  });

  it("winning bar has teal colour class", () => {
    render(
      <ConfidenceChart
        probabilities={[0.2, 0.5, 0.3]}
        classNames={["Root Intrusion", "Sediment Blockage", "Structural Cracks"]}
      />
    );

    const winningBar = screen.getByLabelText(/Sediment Blockage/i).firstElementChild;
    expect(winningBar).toHaveClass("bg-teal-500");
  });
});
