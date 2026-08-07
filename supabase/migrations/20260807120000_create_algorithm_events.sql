-- Raw product-view events for the Prop storefront.
--
-- This table intentionally does not add foreign keys to the shared catalog yet:
-- the existing shared database schema was not available to inspect from this
-- workspace. The API and RLS policy validate the product/group relationship.

create table if not exists public.algorithm_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null default 'product_view'
    check (event_type in ('product_view')),
  source_tag text not null default 'prop',
  product_id bigint not null,
  collection_group_id text not null,

  user_id uuid references auth.users(id) on delete set null,
  visitor_id uuid,
  identity_type text not null
    check (identity_type in ('user', 'visitor')),
  identity_key text generated always as (
    case
      when identity_type = 'user' then 'user:' || user_id::text
      else 'visitor:' || visitor_id::text
    end
  ) stored,
  view_bucket bigint not null,

  ip_hash text,
  country text,
  region text,
  city text,
  isp text,
  asn text,
  user_agent text,
  referrer text,

  traffic_type text not null default 'unknown'
    check (traffic_type in ('customer', 'internal', 'bot', 'unknown')),
  is_bot boolean not null default false,
  is_internal boolean not null default false,
  is_countable boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint algorithm_events_identity_check check (
    (identity_type = 'user' and user_id is not null and visitor_id is null)
    or
    (identity_type = 'visitor' and user_id is null and visitor_id is not null)
  ),
  constraint algorithm_events_source_check check (source_tag = 'prop')
);

comment on table public.algorithm_events is
  'Raw, server-enriched product view events for the Prop storefront.';
comment on column public.algorithm_events.ip_hash is
  'HMAC of the client IP. The raw IP must never be stored here.';
comment on column public.algorithm_events.view_bucket is
  'UTC epoch-day bucket used for a 24-hour unique-view window.';

create index if not exists algorithm_events_product_created_idx
  on public.algorithm_events (product_id, created_at desc);

create index if not exists algorithm_events_hot_item_idx
  on public.algorithm_events (created_at desc, product_id, identity_key, view_bucket)
  where event_type = 'product_view' and is_countable = true and source_tag = 'prop';

create index if not exists algorithm_events_traffic_idx
  on public.algorithm_events (traffic_type, is_countable, created_at desc);

alter table public.algorithm_events enable row level security;

-- The public event endpoint may insert, but no browser role may read raw events.
grant insert on public.algorithm_events to anon, authenticated;
revoke select, update, delete on public.algorithm_events from anon, authenticated;

drop policy if exists "Prop event endpoint may insert valid events" on public.algorithm_events;
create policy "Prop event endpoint may insert valid events"
  on public.algorithm_events
  for insert
  to anon, authenticated
  with check (
    source_tag = 'prop'
    and (
      user_id is null
      or user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.collection_groups cg
      join public.products p on p.collection_group_id = cg.id
      where cg.id::text = algorithm_events.collection_group_id
        and p.id = algorithm_events.product_id
        and cg.tag ilike '%prop%'
    )
  );

-- Returns the first Hot Item ranking that the future admin site can consume.
-- It intentionally reads raw events for now; a daily aggregate table is a
-- follow-up optimization after event volume is known.
create or replace function public.get_prop_hot_items(limit_count integer default 20)
returns table (
  product_id bigint,
  unique_views bigint,
  score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with unique_views as (
    select distinct on (e.product_id, e.identity_key, e.view_bucket)
      e.product_id,
      e.identity_key,
      e.view_bucket,
      e.created_at,
      e.traffic_type
    from public.algorithm_events e
    where e.source_tag = 'prop'
      and e.event_type = 'product_view'
      and e.is_countable = true
      and e.created_at >= now() - interval '30 days'
    order by e.product_id, e.identity_key, e.view_bucket, e.created_at desc
  ),
  scored as (
    select
      uv.product_id,
      count(*)::bigint as unique_views,
      sum(
        power(
          0.5,
          greatest(0, extract(epoch from (now() - uv.created_at)) / 86400.0) / 7.0
        )
        * case when uv.traffic_type = 'customer' then 1.0 else 0.8 end
      )
      * case
          when coalesce(stock.total_qty, 0) > 0 then 1.0
          else 0.6
        end as score
    from unique_views uv
    join public.products p on p.id = uv.product_id
    left join lateral (
      select coalesce(sum(s.qty), 0) as total_qty
      from public.stock s
      where s.product_id = p.id
    ) stock on true
    where (p.status = 'active' or p.status is null)
      and exists (
        select 1
        from public.collection_groups cg
        where cg.id = p.collection_group_id
          and cg.tag ilike '%prop%'
      )
    group by uv.product_id, stock.total_qty
  )
  select scored.product_id, scored.unique_views, scored.score
  from scored
  order by scored.score desc, scored.unique_views desc, scored.product_id
  limit greatest(1, least(limit_count, 100));
$$;

-- This function returns only product IDs and aggregate scores; it never returns
-- raw events, IP hashes or location data. That makes the no-extra-env route
-- usable with the existing publishable/anon Supabase key.
revoke all on function public.get_prop_hot_items(integer) from public, anon, authenticated;
grant execute on function public.get_prop_hot_items(integer) to anon, authenticated, service_role;

-- Hot Item score reference (computed by the server/admin consumer for now):
--   sum(exp(-ln(2) * age_days / 7) * traffic_quality_weight)
--   * availability_factor
-- over unique (identity_key, product_id, view_bucket) events in the last 30 days.
-- Keep the daily aggregate table as a follow-up migration once volume justifies it.
