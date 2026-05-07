import "@testing-library/jest-dom";

const storage: Record<string, string> = {};

Object.defineProperty(window, "localStorage", {
  value: {
    getItem: jest.fn((key: string) => (key in storage ? storage[key] : null)),
    setItem: jest.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete storage[key];
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach((key) => delete storage[key]);
    })
  },
  writable: true
});

class MockFileReader {
  public result: string | ArrayBuffer | null = null;
  public onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
  public onerror: (() => void) | null = null;

  readAsDataURL(): void {
    this.result = "data:image/mock;base64,preview";
    if (this.onload) {
      this.onload({ target: this } as unknown as ProgressEvent<FileReader>);
    }
  }
}

Object.defineProperty(window, "FileReader", {
  value: MockFileReader,
  writable: true
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: query.includes("dark"),
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
});

global.fetch = jest.fn();
