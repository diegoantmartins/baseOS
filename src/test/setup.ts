import "@testing-library/jest-dom";
import { configure } from "@testing-library/dom";
import { afterEach, vi } from "vitest";

// Configure testing-library asyncUtilTimeout to 5000ms for reliable testing under load
configure({ asyncUtilTimeout: 5000 });

import fs from 'node:fs';

// Fix JSDOM cross-realm Buffer handling in pdfkit when rendering embedded base64 images
const originalReadFileSync = fs.readFileSync;
fs.readFileSync = function (path: unknown, options?: unknown) {
  if (path && (Buffer.isBuffer(path) || (typeof path === 'object' && 'buffer' in path && 'byteLength' in path))) {
    return path as unknown as Buffer;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return originalReadFileSync.call(this, path as any, options as any);
} as typeof fs.readFileSync;

// Mock matchMedia
if (typeof window !== 'undefined') {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });

  // Mock ResizeObserver
  if (typeof window.ResizeObserver === 'undefined') {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  // Mock IntersectionObserver
  if (typeof window.IntersectionObserver === 'undefined') {
    window.IntersectionObserver = class IntersectionObserver {
      root = null;
      rootMargin = '';
      thresholds = [];
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() { return []; }
    };
  }

  // Mock scrollTo
  window.scrollTo = vi.fn();
}

// Global deterministic cleanup between test cases
afterEach(() => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
  if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
  vi.restoreAllMocks();
});
