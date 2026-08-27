"use client";

// Client-side CLIP Vision extraction via Web Worker (bypasses Next.js bundler entirely)

let worker: Worker | null = null;
let workerReady = false;

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker("/workers/clip-worker.js", { type: "module" });
  workerReady = true;
  return worker;
}

export function extractImageEmbedding(
  file: File,
  onProgress?: (progress: number, text: string) => void
): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const w = getWorker();

    const handler = (event: MessageEvent) => {
      const { type, embedding, error, progress, text } = event.data;

      if (type === "progress" && onProgress) {
        onProgress(progress, text);
      } else if (type === "result") {
        w.removeEventListener("message", handler);
        w.removeEventListener("error", errorHandler);
        resolve(embedding);
      } else if (type === "error") {
        w.removeEventListener("message", handler);
        w.removeEventListener("error", errorHandler);
        reject(new Error(error));
      }
    };

    const errorHandler = (event: ErrorEvent) => {
      w.removeEventListener("message", handler);
      w.removeEventListener("error", errorHandler);
      reject(new Error(event.message || "Worker error"));
    };

    w.addEventListener("message", handler);
    w.addEventListener("error", errorHandler);

    // Read file as ArrayBuffer and send to worker
    file.arrayBuffer().then((buffer) => {
      w.postMessage(
        { type: "extract", imageData: buffer, mimeType: file.type },
        [buffer] // Transfer ownership for zero-copy
      );
    }).catch(reject);
  });
}
