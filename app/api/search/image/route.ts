import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/supabase/server";
import { AutoProcessor, CLIPVisionModelWithProjection, RawImage, env } from "@xenova/transformers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Configure HuggingFace cache directory for serverless environments (Vercel / Cloud)
env.allowLocalModels = false;
env.useBrowserCache = false;
env.cacheDir = "/tmp/transformers-cache";

// Singleton cache for CLIP model & processor to keep search ultra-fast
let cachedModel: any = null;
let cachedProcessor: any = null;
let modelLoadingPromise: Promise<[any, any]> | null = null;

async function getClipModel() {
  if (cachedModel && cachedProcessor) {
    return [cachedModel, cachedProcessor];
  }

  if (modelLoadingPromise) {
    return modelLoadingPromise;
  }

  modelLoadingPromise = (async () => {
    // Using quantized model reduces download size from ~350MB down to ~85MB for fast serverless boot
    const [model, processor] = await Promise.all([
      CLIPVisionModelWithProjection.from_pretrained("Xenova/clip-vit-base-patch32", {
        quantized: true,
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

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let rawImage: any = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const blob = new Blob([buffer], { type: file.type });
      rawImage = await RawImage.fromBlob(blob);
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      const { image, dataUrl } = body;
      const imgSource = image || dataUrl;
      if (!imgSource) {
        return NextResponse.json({ error: "No image payload provided" }, { status: 400 });
      }

      if (imgSource.startsWith("data:")) {
        // Base64 Data URL
        const base64Data = imgSource.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");
        const mime = imgSource.substring(imgSource.indexOf(":") + 1, imgSource.indexOf(";"));
        const blob = new Blob([buffer], { type: mime });
        rawImage = await RawImage.fromBlob(blob);
      } else {
        // URL
        rawImage = await RawImage.read(imgSource);
      }
    } else {
      return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
    }

    // 1. Generate 512-dim vector embedding using CLIP Vision
    const [model, processor] = await getClipModel();
    const inputs = await processor(rawImage);
    const { image_embeds } = await model(inputs);
    const queryVector = Array.from(image_embeds.data);

    // 2. Query Supabase RPC with category_filter = 'prop' (Strict multi-tenant DB protection)
    const supabase = await createClient();
    const { data: matches, error: rpcError } = await supabase.rpc("match_products_by_image_embedding", {
      query_embedding: queryVector,
      match_count: 24,
      category_filter: "prop",
    });

    if (rpcError) {
      console.error("Vector RPC Error:", rpcError);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      matches: matches || [],
      count: (matches || []).length,
    });
  } catch (error: any) {
    console.error("Visual search error:", error);
    return NextResponse.json({ error: error.message || "Failed to process visual search" }, { status: 500 });
  }
}
