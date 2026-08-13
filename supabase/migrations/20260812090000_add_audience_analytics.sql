-- Audience Analytics for the Prop storefront.
-- This migration is additive. It keeps existing product_view rows valid and
-- keeps the shared catalog scoped to products.category_id = 'prop'.

alter table if exists public.algorithm_events
  alter column product_id drop not null,
  alter column collection_group_id drop not null;

alter table if exists public.algorithm_events
  add column if not exists page_type text,
  add column if not exists page_path text,
  add column if not exists page_entity_id text,
  add column if not exists page_instance_id uuid,
  add column if not exists event_name text,
  add column if not exists source_category text not null default 'prop',
  add column if not exists product_category_snapshot text,
  add column if not exists product_name_snapshot text,
  add column if not exists product_sku_snapshot text,
  add column if not exists product_color_snapshot text,
  add column if not exists product_material_snapshot text,
  add column if not exists product_price_snapshot numeric,
  add column if not exists device_type text,
  add column if not exists os_name text,
  add column if not exists browser_name text,
  add column if not exists source_platform text,
  add column if not exists first_touch_source text,
  add column if not exists session_source text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists referrer_host text,
  add column if not exists duration_seconds integer,
  add column if not exists next_page_type text,
  add column if not exists next_product_id bigint,
  add column if not exists journey_outcome text,
  add column if not exists activity_interval_id uuid;

alter table if exists public.algorithm_events
  drop constraint if exists algorithm_events_event_type_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'algorithm_events_event_type_check'
      and conrelid = 'public.algorithm_events'::regclass
  ) then
    alter table public.algorithm_events
      add constraint algorithm_events_event_type_check
      check (event_type in (
        'product_view', 'page_view', 'cta', 'journey',
        'session_start', 'session_heartbeat', 'session_end'
      ));
  end if;
end $$;

alter table if exists public.algorithm_events
  drop constraint if exists algorithm_events_source_category_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'algorithm_events_source_category_check'
      and conrelid = 'public.algorithm_events'::regclass
  ) then
    alter table public.algorithm_events
      add constraint algorithm_events_source_category_check
      check (source_category = 'prop');
  end if;
end $$;

create index if not exists algorithm_events_page_created_idx
  on public.algorithm_events (page_type, created_at desc)
  where source_tag = 'prop';

create index if not exists algorithm_events_session_created_idx
  on public.algorithm_events (session_id, created_at asc)
  where source_tag = 'prop';

create index if not exists algorithm_events_source_created_idx
  on public.algorithm_events (source_platform, session_source, created_at desc)
  where source_tag = 'prop';

create index if not exists algorithm_events_product_snapshot_idx
  on public.algorithm_events (product_category_snapshot, product_price_snapshot)
  where source_tag = 'prop' and product_id is not null;

create table if not exists public.algorithm_activity_intervals (
  id uuid primary key,
  session_id uuid not null,
  page_instance_id uuid not null,
  identity_key text not null,
  identity_type text not null check (identity_type in ('user', 'visitor')),
  user_id uuid references auth.users(id) on delete set null,
  visitor_id uuid,
  page_type text not null,
  page_path text not null,
  product_id bigint,
  started_at timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now(),
  active_seconds integer not null default 0 check (active_seconds >= 0),
  created_at timestamptz not null default now(),
  constraint algorithm_activity_identity_check check (
    (identity_type = 'user' and user_id is not null and visitor_id is null)
    or
    (identity_type = 'visitor' and user_id is null and visitor_id is not null)
  )
);

create index if not exists algorithm_activity_session_idx
  on public.algorithm_activity_intervals (session_id, started_at);

create index if not exists algorithm_activity_identity_idx
  on public.algorithm_activity_intervals (identity_key, started_at desc);

create index if not exists algorithm_activity_product_idx
  on public.algorithm_activity_intervals (product_id, started_at desc)
  where product_id is not null;

create table if not exists public.algorithm_sessions (
  session_id uuid primary key,
  identity_key text not null,
  identity_type text not null check (identity_type in ('user', 'visitor')),
  user_id uuid references auth.users(id) on delete set null,
  visitor_id uuid,
  first_seen_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  ended_at timestamptz,
  active_seconds integer not null default 0 check (active_seconds >= 0),
  page_views integer not null default 0 check (page_views >= 0),
  unique_pages integer not null default 0 check (unique_pages >= 0),
  product_views integer not null default 0 check (product_views >= 0),
  product_unique_views integer not null default 0 check (product_unique_views >= 0),
  product_repeat_views integer not null default 0 check (product_repeat_views >= 0),
  first_page_type text,
  last_page_type text,
  last_page_path text,
  exit_type text,
  is_bounce boolean not null default false,
  is_quick_bounce boolean not null default false,
  first_touch_source text,
  session_source text,
  source_platform text,
  country_code text,
  country text,
  region text,
  city text,
  device_type text,
  os_name text,
  browser_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint algorithm_sessions_identity_check check (
    (identity_type = 'user' and user_id is not null and visitor_id is null)
    or
    (identity_type = 'visitor' and user_id is null and visitor_id is not null)
  )
);

create index if not exists algorithm_sessions_identity_idx
  on public.algorithm_sessions (identity_key, last_activity_at desc);

create index if not exists algorithm_sessions_source_idx
  on public.algorithm_sessions (source_platform, session_source, last_activity_at desc);

create table if not exists public.algorithm_product_daily_metrics (
  metric_date date not null,
  product_id bigint not null,
  collection_group_id text,
  source_category text not null default 'prop' check (source_category = 'prop'),
  product_category_snapshot text,
  product_name_snapshot text,
  product_sku_snapshot text,
  product_color_snapshot text,
  product_price_avg numeric,
  total_views bigint not null default 0,
  unique_views bigint not null default 0,
  repeat_views bigint not null default 0,
  avg_active_seconds numeric not null default 0,
  exit_count bigint not null default 0,
  quick_bounce_count bigint not null default 0,
  continue_product_count bigint not null default 0,
  continue_collection_count bigint not null default 0,
  continue_other_count bigint not null default 0,
  top_device text,
  top_browser text,
  top_country text,
  top_region text,
  top_city text,
  top_source_platform text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (metric_date, product_id)
);

create index if not exists algorithm_product_daily_category_idx
  on public.algorithm_product_daily_metrics (product_category_snapshot, metric_date desc);

create table if not exists public.algorithm_viewer_profiles (
  identity_key text primary key,
  identity_type text not null check (identity_type in ('user', 'visitor')),
  user_id uuid references auth.users(id) on delete set null,
  visitor_id uuid,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  sessions_count integer not null default 0,
  page_views integer not null default 0,
  unique_pages integer not null default 0,
  product_views integer not null default 0,
  unique_product_views integer not null default 0,
  repeat_product_views integer not null default 0,
  active_seconds integer not null default 0,
  average_session_seconds numeric not null default 0,
  average_product_price numeric,
  min_product_price numeric,
  max_product_price numeric,
  top_country text,
  top_region text,
  top_city text,
  top_device text,
  top_os text,
  top_browser text,
  first_touch_source text,
  latest_session_source text,
  persona_labels text[] not null default '{}',
  persona_reasons jsonb not null default '{}'::jsonb,
  has_pre_login_history boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint algorithm_viewer_profiles_identity_check check (
    (identity_type = 'user' and user_id is not null and visitor_id is null)
    or
    (identity_type = 'visitor' and user_id is null and visitor_id is not null)
  )
);

create index if not exists algorithm_viewer_profiles_persona_idx
  on public.algorithm_viewer_profiles using gin (persona_labels);

create index if not exists algorithm_viewer_profiles_last_seen_idx
  on public.algorithm_viewer_profiles (last_seen_at desc);

alter table public.algorithm_activity_intervals enable row level security;
alter table public.algorithm_sessions enable row level security;
alter table public.algorithm_product_daily_metrics enable row level security;
alter table public.algorithm_viewer_profiles enable row level security;

revoke all on public.algorithm_activity_intervals from anon, authenticated;
revoke all on public.algorithm_sessions from anon, authenticated;
revoke all on public.algorithm_product_daily_metrics from anon, authenticated;
revoke all on public.algorithm_viewer_profiles from anon, authenticated;

-- Internal ingestion RPC. It receives only server-enriched values from the
-- Next.js endpoint; browsers never receive read access to analytics tables.
create or replace function public.record_prop_analytics_event(p_event jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid := gen_random_uuid();
  v_event_type text := coalesce(p_event->>'event_type', 'page_view');
  v_product_id bigint := nullif(p_event->>'product_id', '')::bigint;
  v_collection_group_id text := nullif(p_event->>'collection_group_id', '');
  v_session_id uuid := nullif(p_event->>'session_id', '')::uuid;
  v_page_instance_id uuid := nullif(p_event->>'page_instance_id', '')::uuid;
  v_activity_interval_id uuid := nullif(p_event->>'activity_interval_id', '')::uuid;
  v_identity_type text := coalesce(p_event->>'identity_type', 'visitor');
  v_user_id uuid := nullif(p_event->>'user_id', '')::uuid;
  v_visitor_id uuid := nullif(p_event->>'visitor_id', '')::uuid;
  v_identity_key text := nullif(p_event->>'identity_key', '');
  v_page_type text := nullif(p_event->>'page_type', '');
  v_page_path text := nullif(p_event->>'page_path', '');
  v_active_seconds integer := greatest(0, coalesce((p_event->>'active_seconds')::integer, 0));
  v_is_repeat boolean := false;
begin
  if v_event_type not in ('product_view', 'page_view', 'cta', 'journey', 'session_start', 'session_heartbeat', 'session_end') then
    raise exception 'Unsupported analytics event type';
  end if;

  if v_identity_type not in ('user', 'visitor') or v_session_id is null or v_identity_key is null then
    raise exception 'Invalid analytics identity or session';
  end if;

  if v_event_type in ('page_view', 'product_view', 'cta', 'journey') and v_page_path is null then
    raise exception 'Page path is required';
  end if;

  if v_product_id is not null then
    if not exists (
      select 1
      from public.products p
      join public.collection_groups cg on cg.id = p.collection_group_id
      where p.id = v_product_id
        and p.category_id = 'prop'
        and (v_collection_group_id is null or cg.id::text = v_collection_group_id)
        and cg.tag ilike '%prop%'
    ) then
      raise exception 'Product is not a Prop product';
    end if;
  end if;

  if v_event_type = 'product_view' and v_product_id is not null then
    select exists (
      select 1 from public.algorithm_events e
      where e.identity_key = v_identity_key
        and e.product_id = v_product_id
        and e.view_bucket = floor(extract(epoch from now()) / 86400)::bigint
        and e.event_type = 'product_view'
    ) into v_is_repeat;
  end if;

  insert into public.algorithm_events (
    id, event_type, source_tag, product_id, collection_group_id,
    user_id, visitor_id, identity_type, view_bucket,
    ip_hash, country_code, country, region, city, isp, asn, user_agent, referrer,
    traffic_type, is_bot, is_internal, is_countable, metadata, created_at,
    session_id, previous_product_id, page_type, page_path, page_entity_id,
    page_instance_id, event_name, source_category, product_category_snapshot,
    product_name_snapshot, product_sku_snapshot, product_color_snapshot,
    product_material_snapshot, product_price_snapshot, device_type, os_name,
    browser_name, source_platform, first_touch_source, session_source,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    referrer_host, duration_seconds, next_page_type, next_product_id,
    journey_outcome, activity_interval_id
  ) values (
    v_event_id, v_event_type, 'prop', v_product_id, v_collection_group_id,
    case when v_identity_type = 'user' then v_user_id else null end,
    case when v_identity_type = 'visitor' then v_visitor_id else null end,
    v_identity_type, floor(extract(epoch from now()) / 86400)::bigint,
    nullif(p_event->>'ip_hash', ''), nullif(p_event->>'country_code', ''),
    nullif(p_event->>'country', ''), nullif(p_event->>'region', ''), nullif(p_event->>'city', ''),
    nullif(p_event->>'isp', ''), nullif(p_event->>'asn', ''), nullif(p_event->>'user_agent', ''),
    nullif(p_event->>'referrer', ''), coalesce(p_event->>'traffic_type', 'unknown'),
    coalesce((p_event->>'is_bot')::boolean, false), coalesce((p_event->>'is_internal')::boolean, false),
    coalesce((p_event->>'is_countable')::boolean, true), coalesce(p_event->'metadata', '{}'::jsonb), now(),
    v_session_id, nullif(p_event->>'previous_product_id', '')::bigint,
    v_page_type, v_page_path, nullif(p_event->>'page_entity_id', ''), v_page_instance_id,
    nullif(p_event->>'event_name', ''), 'prop', nullif(p_event->>'product_category_snapshot', ''),
    nullif(p_event->>'product_name_snapshot', ''), nullif(p_event->>'product_sku_snapshot', ''),
    nullif(p_event->>'product_color_snapshot', ''), nullif(p_event->>'product_material_snapshot', ''),
    nullif(p_event->>'product_price_snapshot', '')::numeric,
    nullif(p_event->>'device_type', ''), nullif(p_event->>'os_name', ''), nullif(p_event->>'browser_name', ''),
    nullif(p_event->>'source_platform', ''), nullif(p_event->>'first_touch_source', ''), nullif(p_event->>'session_source', ''),
    nullif(p_event->>'utm_source', ''), nullif(p_event->>'utm_medium', ''), nullif(p_event->>'utm_campaign', ''),
    nullif(p_event->>'utm_content', ''), nullif(p_event->>'utm_term', ''), nullif(p_event->>'referrer_host', ''),
    nullif(p_event->>'duration_seconds', '')::integer, nullif(p_event->>'next_page_type', ''),
    nullif(p_event->>'next_product_id', '')::bigint, nullif(p_event->>'journey_outcome', ''), v_activity_interval_id
  );

  insert into public.algorithm_sessions (
    session_id, identity_key, identity_type, user_id, visitor_id,
    first_seen_at, last_activity_at, first_page_type, last_page_type,
    last_page_path, first_touch_source, session_source, source_platform,
    country_code, country, region, city, device_type, os_name, browser_name
  ) values (
    v_session_id, v_identity_key, v_identity_type,
    case when v_identity_type = 'user' then v_user_id else null end,
    case when v_identity_type = 'visitor' then v_visitor_id else null end,
    now(), now(), v_page_type, v_page_type, v_page_path,
    nullif(p_event->>'first_touch_source', ''), nullif(p_event->>'session_source', ''), nullif(p_event->>'source_platform', ''),
    nullif(p_event->>'country_code', ''), nullif(p_event->>'country', ''), nullif(p_event->>'region', ''), nullif(p_event->>'city', ''),
    nullif(p_event->>'device_type', ''), nullif(p_event->>'os_name', ''), nullif(p_event->>'browser_name', '')
  ) on conflict (session_id) do update set
    last_activity_at = now(),
    last_page_type = coalesce(excluded.last_page_type, algorithm_sessions.last_page_type),
    last_page_path = coalesce(excluded.last_page_path, algorithm_sessions.last_page_path),
    source_platform = coalesce(algorithm_sessions.source_platform, excluded.source_platform),
    session_source = coalesce(algorithm_sessions.session_source, excluded.session_source),
    updated_at = now();

  if v_event_type = 'page_view' then
    update public.algorithm_sessions s
    set page_views = (select count(*) from public.algorithm_events e where e.session_id = v_session_id and e.event_type = 'page_view'),
        unique_pages = (select count(distinct e.page_path) from public.algorithm_events e where e.session_id = v_session_id and e.page_path is not null),
        updated_at = now()
    where s.session_id = v_session_id;
  elsif v_event_type = 'product_view' then
    update public.algorithm_sessions s
    set product_views = (select count(*) from public.algorithm_events e where e.session_id = v_session_id and e.event_type = 'product_view'),
        product_repeat_views = s.product_repeat_views + case when v_is_repeat then 1 else 0 end,
        product_unique_views = s.product_unique_views + case when not v_is_repeat then 1 else 0 end,
        updated_at = now()
    where s.session_id = v_session_id;
  elsif v_event_type = 'session_heartbeat' and v_activity_interval_id is not null then
    insert into public.algorithm_activity_intervals (
      id, session_id, page_instance_id, identity_key, identity_type, user_id, visitor_id,
    page_type, page_path, product_id, started_at, last_heartbeat_at, active_seconds
    ) values (
      v_activity_interval_id, v_session_id, coalesce(v_page_instance_id, gen_random_uuid()), v_identity_key, v_identity_type,
      case when v_identity_type = 'user' then v_user_id else null end,
      case when v_identity_type = 'visitor' then v_visitor_id else null end,
      coalesce(v_page_type, 'unknown'), coalesce(v_page_path, '/'), v_product_id, now(), now(), v_active_seconds
    ) on conflict (id) do update set
      last_heartbeat_at = now(), active_seconds = greatest(algorithm_activity_intervals.active_seconds, excluded.active_seconds);

    update public.algorithm_sessions s
    set active_seconds = coalesce((
      with ranges as (
        select tstzrange(a.started_at, greatest(a.last_heartbeat_at, a.started_at) + interval '15 seconds', '[)') as r
        from public.algorithm_activity_intervals a
        where a.session_id = v_session_id
      ), ordered as (
        select r, max(upper(r)) over (order by lower(r), upper(r) rows between unbounded preceding and 1 preceding) as prev_end
        from ranges
      ), grouped as (
        select r, sum(case when prev_end is null or lower(r) > prev_end then 1 else 0 end) over (order by lower(r), upper(r)) as grp
        from ordered
      ), merged as (
        select grp, min(lower(r)) as start_at, max(upper(r)) as end_at from grouped group by grp
      ) select round(sum(extract(epoch from (end_at - start_at))))::integer from merged
    ), 0), updated_at = now()
    where s.session_id = v_session_id;
  elsif v_event_type = 'session_end' then
    update public.algorithm_sessions s
    set ended_at = now(),
        exit_type = nullif(p_event->>'exit_type', ''),
        is_bounce = coalesce((p_event->>'is_bounce')::boolean, false),
        is_quick_bounce = coalesce((p_event->>'is_quick_bounce')::boolean, false),
        updated_at = now()
    where s.session_id = v_session_id;
  end if;

  return v_event_id;
end;
$$;

revoke all on function public.record_prop_analytics_event(jsonb) from public, anon, authenticated;
grant execute on function public.record_prop_analytics_event(jsonb) to anon, authenticated, service_role;

comment on table public.algorithm_activity_intervals is 'Merged later into session active time; one row is a continuous active interval for one tab/page instance.';
comment on table public.algorithm_sessions is 'Session read model for the Prop audience analytics dashboard.';
comment on table public.algorithm_product_daily_metrics is 'Persistent daily product analytics aggregate; raw events remain the source of truth.';
comment on table public.algorithm_viewer_profiles is 'Persistent viewer/persona read model; anonymous identity means browser profile, not a verified person.';
