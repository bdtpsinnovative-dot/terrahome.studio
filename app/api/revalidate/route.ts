import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function timingSafeMatch(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < provided.length; i++) {
    result |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}

function extractSecret(request: Request, body: Record<string, unknown>): string {
  const headerSecret = request.headers.get('x-revalidate-secret')?.trim();
  if (headerSecret) return headerSecret;

  const authHeader =
    request.headers.get('authorization') || request.headers.get('Authorization') || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }

  if (typeof body.secret === 'string' && body.secret.trim()) {
    return body.secret.trim();
  }

  return '';
}

export async function POST(request: NextRequest) {
  const expectedSecret = (
    process.env.REVALIDATE_SECRET ||
    process.env.TERRA_REVALIDATE_SECRET ||
    'inventoryeiei'
  ).trim();

  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text.trim()) {
      body = JSON.parse(text) as Record<string, unknown>;
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON request body.' },
      { status: 400 }
    );
  }

  const providedSecret = extractSecret(request, body);
  if (!providedSecret || !timingSafeMatch(providedSecret, expectedSecret)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: invalid revalidation secret.' },
      { status: 401 }
    );
  }

  const purgedTags = new Set<string>();
  const purgedPaths = new Set<string>();

  const expireTag = (tag: string) => {
    try {
      revalidateTag(tag, { expire: 0 });
      purgedTags.add(tag);
    } catch (e: any) {
      console.warn(`[revalidate] Failed to revalidate tag ${tag}:`, e?.message || e);
    }
  };

  const expirePath = (path: string, type?: 'layout' | 'page') => {
    try {
      if (type) {
        revalidatePath(path, type);
        purgedPaths.add(`${path} (${type})`);
      } else {
        revalidatePath(path);
        purgedPaths.add(path);
      }
    } catch (e: any) {
      console.warn(`[revalidate] Failed to revalidate path ${path}:`, e?.message || e);
    }
  };

  const scope = String(body.scope || 'all').toLowerCase();

  // 1. Tag Invalidation
  expireTag('terra-discounts');
  expireTag('terra-promotions');
  expireTag('terra-catalog');
  if (scope === 'products' || scope === 'all') {
    expireTag('terra-products');
    expireTag('terra-collections');
  }

  // 2. Targeted Route Invalidation
  if (scope === 'discounts' || scope === 'promotions' || scope === 'all') {
    expirePath('/prop');
    expirePath('/cart');
    expirePath('/prop/[groupId]/[sku]', 'page');
    expirePath('/collections/[slug]', 'page');
    expirePath('/collections/[slug]/[imageId]', 'page');
    expirePath('/facebook-feed.xml');
    expirePath('/sys-diag/feed');
  }

  // Specific product IDs
  if (Array.isArray(body.productIds)) {
    for (const pid of body.productIds) {
      if (pid) {
        expireTag(`product:${pid}`);
      }
    }
  }

  // Cloudflare Purge if configured
  const cfZoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
  const cfToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  let cfResult: any = { skipped: true };

  if (cfZoneId && cfToken) {
    try {
      const cfRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/purge_cache`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cfToken}`,
          },
          body: JSON.stringify({ purge_everything: true }),
        }
      );
      const cfJson = await cfRes.json().catch(() => null);
      cfResult = { ok: cfRes.ok, status: cfRes.status, data: cfJson };
    } catch (cfErr: any) {
      cfResult = { ok: false, error: cfErr?.message || 'Cloudflare error' };
    }
  }

  return NextResponse.json(
    {
      success: true,
      revalidated: true,
      revalidatedAt: new Date().toISOString(),
      scope,
      reason: body.reason || 'admin-mutation',
      purgedTags: Array.from(purgedTags),
      purgedPaths: Array.from(purgedPaths),
      cloudflare: cfResult,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
