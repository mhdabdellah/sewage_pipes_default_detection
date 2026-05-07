import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import ImageUploader from "@/components/ImageUploader";

describe("ImageUploader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the drag-and-drop zone", () => {
    render(<ImageUploader onResult={jest.fn()} onLoading={jest.fn()} />);
    expect(screen.getByText(/Goruntuyu bu alana birakin/i)).toBeInTheDocument();
  });

  it("accepts a valid JPEG file", async () => {
    render(<ImageUploader onResult={jest.fn()} onLoading={jest.fn()} />);
    const input = screen.getByLabelText(/Goruntu sec/i);
    const file = new File(["image"], "sample.jpg", { type: "image/jpeg" });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByAltText(/Secilen goruntu onizlemesi/i)).toBeInTheDocument());
  });

  it("shows file preview after selection", async () => {
    render(<ImageUploader onResult={jest.fn()} onLoading={jest.fn()} />);
    const input = screen.getByLabelText(/Goruntu sec/i);
    const file = new File(["image"], "sample.jpg", { type: "image/jpeg" });

    fireEvent.change(input, { target: { files: [file] } });

    const previewImage = await screen.findByAltText(/Secilen goruntu onizlemesi/i);
    expect(previewImage).toHaveAttribute("src", "data:image/mock;base64,preview");
  });

  it("rejects a .txt file with an error message", async () => {
    render(<ImageUploader onResult={jest.fn()} onLoading={jest.fn()} />);
    const input = screen.getByLabelText(/Goruntu sec/i);
    const file = new File(["plain-text"], "notes.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByRole("alert")).toHaveTextContent(/Sadece JPEG, PNG veya WEBP dosyalari yukleyebilirsiniz./i);
  });

  it("calls onLoading(true) then onLoading(false) after submit", async () => {
    const onLoading = jest.fn();
    const onResult = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        class_name: "Root Intrusion",
        class_id: 0,
        confidence: 0.95,
        probabilities: [0.95, 0.03, 0.02]
      })
    });

    render(<ImageUploader onResult={onResult} onLoading={onLoading} />);
    const input = screen.getByLabelText(/Goruntu sec/i);
    const file = new File(["image"], "sample.jpg", { type: "image/jpeg" });

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(await screen.findByRole("button", { name: /Goruntu Analiz Et/i }));

    await waitFor(() => expect(onLoading).toHaveBeenNthCalledWith(1, true));
    await waitFor(() => expect(onLoading).toHaveBeenLastCalledWith(false));
    expect(onResult).toHaveBeenCalledTimes(1);
  });

  it("calls onResult with parsed PredictionResult after successful fetch", async () => {
    const onResult = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        class_name: "Root Intrusion",
        class_id: 0,
        confidence: 0.95,
        probabilities: [0.95, 0.03, 0.02]
      })
    });

    render(<ImageUploader onResult={onResult} onLoading={jest.fn()} />);
    const input = screen.getByLabelText(/Goruntu sec/i);
    const file = new File(["image"], "sample.jpg", { type: "image/jpeg" });

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(await screen.findByRole("button", { name: /Goruntu Analiz Et/i }));

    await waitFor(() =>
      expect(onResult).toHaveBeenCalledWith(
        expect.objectContaining({
          class_name: "Root Intrusion",
          class_id: 0,
          confidence: 0.95,
          probabilities: [0.95, 0.03, 0.02],
          imagePreview: "data:image/mock;base64,preview",
          timestamp: expect.any(String)
        })
      )
    );
  });
});
