"use client";

// Client-side CLIP Vision feature extraction using WebAssembly/WebGPU via @xenova/transformers
let cachedModel: any = null;
let cachedProcessor: any = null;
let modelLoadingPromise: Promise<[any, any]> | null = null;

export async function loadClientClipModel(onProgress?: (progress: number, text: string) => void) {
  if (cachedModel && cachedProcessor) {
    return [cachedModel, cachedProcessor];
  }

  if (modelLoadingPromise) {
    return modelLoadingPromise;
  }

  modelLoadingPromise = (async () => {
    // Dynamic import to ensure it runs strictly in client browser
    const { AutoProcessor, CLIPVisionModelWithProjection, env } = await import("@xenova/transformers");

    // Configure client-side caching in browser IndexedDB/CacheStorage
    env.allowLocalModels = false;
    env.useBrowserCache = true;

    const progressCallback = (info: any) => {
      if (info.status === "progress" && info.progress !== undefined && onProgress) {
        onProgress(Math.round(info.progress), `Loading AI Model: ${Math.round(info.progress)}%`);
      } else if (info.status === "ready" && onProgress) {
        onProgress(100, "AI Model Ready");
      }
    };

    // Load quantized model (~85MB) cached in user browser
    const [model, processor] = await Promise.all([
      CLIPVisionModelWithProjection.from_pretrained("Xenova/clip-vit-base-patch32", {
        quantized: true,
        progress_callback: progressCallback,
      }),
      AutoProcessor.from_pretrained("Xenova/clip-vit-base-patch32"),
    ]);

    cachedModel = model;
    cachedProcessor = processor;
    return [model, processor] as [any, any];
  })().catch((err) => {
    modelLoadingPromise = null;
    throw err;
  });

  return modelLoadingPromise;
}

export async function extractImageEmbedding(
  imageSource: File | Blob | string,
  onProgress?: (progress: number, text: string) => void
): Promise<number[]> {
  const { RawImage } = await import("@xenova/transformers");
  const [model, processor] = await loadClientClipModel(onProgress);

  let rawImage: any;
  if (imageSource instanceof Blob) {
    rawImage = await RawImage.fromBlob(imageSource);
  } else if (typeof imageSource === "string") {
    if (imageSource.startsWith("data:")) {
      const base64Data = imageSource.split(",")[1];
      const buffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      const mime = imageSource.substring(imageSource.indexOf(":") + 1, imageSource.indexOf(";"));
      const blob = new Blob([buffer], { type: mime });
      rawImage = await RawImage.fromBlob(blob);
    } else {
      rawImage = await RawImage.read(imageSource);
    }
  } else {
    throw new Error("Unsupported image source");
  }

  if (onProgress) {
    onProgress(100, "Extracting visual features...");
  }

  const inputs = await processor(rawImage);
  const { image_embeds } = await model(inputs);
  return Array.from(image_embeds.data) as number[];
}
