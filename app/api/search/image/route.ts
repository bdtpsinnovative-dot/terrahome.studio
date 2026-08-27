import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Expected JSON with { embedding: number[] }" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { embedding } = body;

    if (!Array.isArray(embedding) || embedding.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid embedding vector. Client must extract CLIP embedding before calling this API." },
        { status: 400 }
      );
    }

    // Query Supabase RPC with category_filter = 'prop' (Strict multi-tenant DB protection)
    const supabase = await createClient();
    const { data: matches, error: rpcError } = await supabase.rpc("match_products_by_image_embedding", {
      query_embedding: embedding,
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
