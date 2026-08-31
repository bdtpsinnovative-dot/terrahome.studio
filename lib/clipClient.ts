"use client";
 
// Client-side CLIP Vision extraction via Web Worker (bypasses Next.js bundler entirely)

let worker: Worker | null = null;
let isPreloading = false;
let isPreloaded = false;

function getWorker(): Worker | null {
  if (typeof window === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker("/workers/clip-worker.js", { type: "module" });
    return worker;
  } catch (err) {
    console.warn("Could not instantiate CLIP Worker:", err);
    return null;
  }
}

/**
 * Preload the AI Vision model silently in background when network/CPU is idle
 */
export function preloadClipModel(): void {
  if (isPreloaded || isPreloading) return;
  const w = getWorker();
  if (!w) return;

  isPreloading = true;

  const onInitMessage = (event: MessageEvent) => {
    if (event.data?.type === "ready") {
      isPreloaded = true;
      isPreloading = false;
      w.removeEventListener("message", onInitMessage);
    }
  };

  w.addEventListener("message", onInitMessage);
  w.postMessage({ type: "preload" });
}

/**
 * Fast client-side image resizing via Canvas before passing to AI worker
 * Resizing a 10MB image down to ~336px takes 2ms and speeds up CLIP inference by 5-10x
 */
export async function resizeImageForCLIP(file: File, maxDimension = 336): Promise<{ buffer: ArrayBuffer; mimeType: string }> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      file.arrayBuffer().then((buffer) => resolve({ buffer, mimeType: file.type })).catch(reject);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          file.arrayBuffer().then((buffer) => resolve({ buffer, mimeType: file.type })).catch(reject);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              file.arrayBuffer().then((buffer) => resolve({ buffer, mimeType: file.type })).catch(reject);
              return;
            }
            blob.arrayBuffer().then((buffer) => {
              resolve({ buffer, mimeType: "image/jpeg" });
            }).catch(reject);
          },
          "image/jpeg",
          0.85
        );
      } catch {
        file.arrayBuffer().then((buffer) => resolve({ buffer, mimeType: file.type })).catch(reject);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      file.arrayBuffer().then((buffer) => resolve({ buffer, mimeType: file.type })).catch(reject);
    };

    img.src = url;
  });
}

export function extractImageEmbedding(
  file: File,
  onProgress?: (progress: number, text: string) => void
): Promise<number[]> {
  return new Promise(async (resolve, reject) => {
    const w = getWorker();
    if (!w) {
      return reject(new Error("Web Worker is not supported in this browser"));
    }

    const handler = (event: MessageEvent) => {
      const { type, embedding, error, progress, text } = event.data;

      if (type === "progress" && onProgress) {
        onProgress(progress, text);
      } else if (type === "result") {
        cleanup();
        isPreloaded = true;
        resolve(embedding);
      } else if (type === "error") {
        cleanup();
        reject(new Error(error));
      }
    };

    const errorHandler = (event: ErrorEvent) => {
      cleanup();
      reject(new Error(event.message || "Worker error"));
    };

    const cleanup = () => {
      w.removeEventListener("message", handler);
      w.removeEventListener("error", errorHandler);
    };

    w.addEventListener("message", handler);
    w.addEventListener("error", errorHandler);

    try {
      // 1. Resize image with fast hardware-accelerated Canvas (2ms)
      const { buffer, mimeType } = await resizeImageForCLIP(file);

      // 2. Transfer ownership to worker for zero-copy
      w.postMessage(
        { type: "extract", imageData: buffer, mimeType },
        [buffer]
      );
    } catch (err) {
      cleanup();
      reject(err);
    }
  });
}
