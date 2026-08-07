-- Store a normalized country code alongside the existing location fields.
-- The value is enriched server-side from a trusted proxy/CDN or IP lookup;
-- the browser must never provide it.

alter table if exists public.algorithm_events
  add column if not exists country_code text;

comment on column public.algorithm_events.country_code is
  'Uppercase ISO 3166-1 alpha-2 country code when available; nullable for unknown or unavailable location.';

create index if not exists algorithm_events_country_code_created_idx
  on public.algorithm_events (country_code, created_at desc);
