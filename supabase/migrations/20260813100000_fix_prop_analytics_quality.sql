-- Fixes for the Prop analytics pipeline.
-- Raw events remain the source of truth. This migration only adds columns,
-- indexes and server-side read models; it does not remove historical events.

alter table if exists public.algorithm_events
  add column if not exists is_bounce boolean not null default false,
  add column if not exists is_quick_bounce boolean not null default false;

create index if not exists algorithm_events_identity_product_created_idx
  on public.algorithm_events (identity_key, product_id, created_at asc)
  where source_tag = 'prop' and event_type = 'product_view';

alter table if exists public.algorithm_viewer_profiles
  add column if not exists range_days integer not null default 30;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'algorithm_viewer_profiles_pkey'
      and conrelid = 'public.algorithm_viewer_profiles'::regclass
  ) then
    alter table public.algorithm_viewer_profiles drop constraint algorithm_viewer_profiles_pkey;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'algorithm_viewer_profiles_range_pkey'
      and conrelid = 'public.algorithm_viewer_profiles'::regclass
  ) then
    alter table public.algorithm_viewer_profiles
      add constraint algorithm_viewer_profiles_range_pkey primary key (identity_key, range_days);
  end if;
end $$;

create index if not exists algorithm_viewer_profiles_range_last_seen_idx
  on public.algorithm_viewer_profiles (range_days, last_seen_at desc);

-- Store the new exit fields and use the rolling 24-hour rule when updating a
-- session. This replaces the ingestion function from the previous migration.
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
  if v_product_id is not null and not exists (
    select 1 from public.products p
    join public.collection_groups cg on cg.id = p.collection_group_id
    where p.id = v_product_id and p.category_id = 'prop'
      and (v_collection_group_id is null or cg.id::text = v_collection_group_id)
      and cg.tag ilike '%prop%'
  ) then
    raise exception 'Product is not a Prop product';
  end if;

  if v_event_type = 'product_view' and v_product_id is not null then
    select exists (
      select 1 from public.algorithm_events e
      where e.identity_key = v_identity_key
        and e.product_id = v_product_id
        and e.event_type = 'product_view'
        and e.created_at >= now() - interval '24 hours'
    ) into v_is_repeat;
  end if;

  insert into public.algorithm_events (
    id, event_type, source_tag, product_id, collection_group_id,
    user_id, visitor_id, identity_type, view_bucket,
    ip_hash, country_code, country, region, city, isp, asn, user_agent, referrer,
    traffic_type, is_bot, is_internal, is_countable, is_bounce, is_quick_bounce, metadata, created_at,
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
    v_identity_type, floor(extract(epoch from now()) / 86400000)::bigint,
    nullif(p_event->>'ip_hash', ''), nullif(p_event->>'country_code', ''),
    nullif(p_event->>'country', ''), nullif(p_event->>'region', ''), nullif(p_event->>'city', ''),
    nullif(p_event->>'isp', ''), nullif(p_event->>'asn', ''), nullif(p_event->>'user_agent', ''),
    nullif(p_event->>'referrer', ''), coalesce(p_event->>'traffic_type', 'unknown'),
    coalesce((p_event->>'is_bot')::boolean, false), coalesce((p_event->>'is_internal')::boolean, false),
    coalesce((p_event->>'is_countable')::boolean, true), coalesce((p_event->>'is_bounce')::boolean, false),
    coalesce((p_event->>'is_quick_bounce')::boolean, false), coalesce(p_event->'metadata', '{}'::jsonb), now(),
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
    first_seen_at, last_activity_at, first_page_type, last_page_type, last_page_path,
    first_touch_source, session_source, source_platform, country_code, country, region, city,
    device_type, os_name, browser_name
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
    update public.algorithm_sessions s set
      page_views = (select count(*) from public.algorithm_events e where e.session_id = v_session_id and e.event_type = 'page_view'),
      unique_pages = (select count(distinct e.page_path) from public.algorithm_events e where e.session_id = v_session_id and e.page_path is not null),
      updated_at = now()
    where s.session_id = v_session_id;
  elsif v_event_type = 'product_view' then
    update public.algorithm_sessions s set
      product_views = (select count(*) from public.algorithm_events e where e.session_id = v_session_id and e.event_type = 'product_view'),
      product_repeat_views = (select count(*) from public.algorithm_events e where e.session_id = v_session_id and e.event_type = 'product_view' and exists (
        select 1 from public.algorithm_events prior where prior.identity_key = e.identity_key and prior.product_id = e.product_id
          and prior.event_type = 'product_view' and prior.created_at >= e.created_at - interval '24 hours'
          and (prior.created_at < e.created_at or (prior.created_at = e.created_at and prior.id < e.id))
      )),
      product_unique_views = greatest(0, (select count(*) from public.algorithm_events e where e.session_id = v_session_id and e.event_type = 'product_view') - (select count(*) from public.algorithm_events e where e.session_id = v_session_id and e.event_type = 'product_view' and exists (
        select 1 from public.algorithm_events prior where prior.identity_key = e.identity_key and prior.product_id = e.product_id
          and prior.event_type = 'product_view' and prior.created_at >= e.created_at - interval '24 hours'
          and (prior.created_at < e.created_at or (prior.created_at = e.created_at and prior.id < e.id))
      ))),
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
    ) on conflict (id) do update set last_heartbeat_at = now(), active_seconds = greatest(algorithm_activity_intervals.active_seconds, excluded.active_seconds);

    update public.algorithm_sessions s set active_seconds = coalesce((
      with ranges as (
        select tstzrange(a.started_at, greatest(a.last_heartbeat_at, a.started_at) + interval '15 seconds', '[)') as r
        from public.algorithm_activity_intervals a where a.session_id = v_session_id
      ), ordered as (
        select r, max(upper(r)) over (order by lower(r), upper(r) rows between unbounded preceding and 1 preceding) as prev_end from ranges
      ), grouped as (
        select r, sum(case when prev_end is null or lower(r) > prev_end then 1 else 0 end) over (order by lower(r), upper(r)) as grp from ordered
      ), merged as (
        select grp, min(lower(r)) as start_at, max(upper(r)) as end_at from grouped group by grp
      ) select round(sum(extract(epoch from (end_at - start_at))))::integer from merged
    ), 0), updated_at = now() where s.session_id = v_session_id;
  elsif v_event_type = 'session_end' then
    update public.algorithm_sessions s set
      ended_at = now(),
      active_seconds = greatest(s.active_seconds, v_active_seconds),
      exit_type = nullif(p_event->>'exit_type', ''),
      is_bounce = coalesce((p_event->>'is_bounce')::boolean, false),
      is_quick_bounce = coalesce((p_event->>'is_quick_bounce')::boolean, false),
      updated_at = now()
    where s.session_id = v_session_id;
  end if;
  return v_event_id;
end;
$$;

-- A rolling 24-hour unique view. The legacy view_bucket is retained for
-- compatibility, but is no longer used for ranking or audience summaries.
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
  with scoped_events as (
    select e.*
    from public.algorithm_events e
    join public.products p on p.id = e.product_id and p.category_id = 'prop'
    join public.collection_groups cg on cg.id = p.collection_group_id and cg.tag ilike '%prop%'
    where e.source_tag = 'prop'
      and e.event_type = 'product_view'
      and e.is_countable = true
      and e.created_at >= now() - interval '31 days'
  ), unique_views as (
    select e.*
    from scoped_events e
    where e.created_at >= now() - interval '30 days'
      and not exists (
        select 1
        from scoped_events previous
        where previous.identity_key = e.identity_key
          and previous.product_id = e.product_id
          and previous.created_at >= e.created_at - interval '24 hours'
          and (
            previous.created_at < e.created_at
            or (previous.created_at = e.created_at and previous.id < e.id)
          )
      )
  ), scored as (
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
      * case when coalesce(stock.total_qty, 0) > 0 then 1.0 else 0.6 end as score
    from unique_views uv
    join public.products p on p.id = uv.product_id
    left join lateral (
      select coalesce(sum(s.qty), 0) as total_qty
      from public.stock s
      where s.product_id = p.id
    ) stock on true
    where (p.status = 'active' or p.status is null)
    group by uv.product_id, stock.total_qty
  )
  select scored.product_id, scored.unique_views, scored.score
  from scored
  order by scored.score desc, scored.unique_views desc, scored.product_id
  limit greatest(1, least(limit_count, 100));
$$;

-- Rebuilds the daily product read model and the range-based Persona read model.
-- Call this from the Admin server before reading analytics. It is deliberately
-- service-role only because it writes internal analytics summaries.
create or replace function public.refresh_prop_analytics(
  p_from timestamptz default now() - interval '30 days',
  p_to timestamptz default now(),
  p_range_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_products integer := 0;
  v_personas integer := 0;
begin
  if p_to <= p_from or p_range_days not in (1, 7, 30) then
    raise exception 'Invalid analytics refresh range';
  end if;

  drop table if exists prop_refresh_unique;
  drop table if exists prop_refresh_events;

  create temporary table prop_refresh_events on commit drop as
  with links as (
    select distinct
      'visitor:' || (e.metadata->>'linked_visitor_id') as visitor_key,
      'user:' || e.user_id::text as user_key
    from public.algorithm_events e
    where e.source_tag = 'prop'
      and e.identity_type = 'user'
      and e.user_id is not null
      and e.metadata ? 'linked_visitor_id'
  )
  select e.*,
    coalesce(l.user_key, e.identity_key) as canonical_key,
    (l.user_key is not null and e.identity_type = 'visitor') as pre_login_event
  from public.algorithm_events e
  left join public.products p on p.id = e.product_id
  left join public.collection_groups cg on cg.id = p.collection_group_id
  left join links l on l.visitor_key = e.identity_key
  where e.source_tag = 'prop'
    and e.created_at >= p_from - interval '24 hours'
    and e.created_at < p_to
    and (
      e.product_id is null
      or (p.category_id = 'prop' and cg.tag ilike '%prop%')
    );

  create index on prop_refresh_events (canonical_key, product_id, created_at);
  create index on prop_refresh_events (event_type, product_id, created_at);

  create temporary table prop_refresh_unique on commit drop as
  select e.*
  from prop_refresh_events e
  where e.event_type = 'product_view'
    and e.is_countable = true
    and e.traffic_type not in ('bot', 'internal')
    and e.created_at >= p_from
    and not exists (
      select 1
      from prop_refresh_events previous
      where previous.event_type = 'product_view'
        and previous.is_countable = true
        and previous.traffic_type not in ('bot', 'internal')
        and previous.canonical_key = e.canonical_key
        and previous.product_id = e.product_id
        and previous.created_at >= e.created_at - interval '24 hours'
        and (
          previous.created_at < e.created_at
          or (previous.created_at = e.created_at and previous.id < e.id)
        )
    );

  delete from public.algorithm_product_daily_metrics
  where metric_date >= (p_from at time zone 'UTC')::date
    and metric_date <= (p_to at time zone 'UTC')::date;

  insert into public.algorithm_product_daily_metrics (
    metric_date, product_id, collection_group_id, source_category,
    product_category_snapshot, product_name_snapshot, product_sku_snapshot,
    product_color_snapshot, product_price_avg, total_views, unique_views,
    repeat_views, avg_active_seconds, exit_count, quick_bounce_count,
    continue_product_count, continue_collection_count, continue_other_count,
    top_device, top_browser, top_country, top_region, top_city, top_source_platform
  )
  with daily_views as (
    select
      (e.created_at at time zone 'UTC')::date as metric_date,
      e.product_id,
      max(e.collection_group_id) as collection_group_id,
      max(e.product_category_snapshot) as product_category_snapshot,
      max(e.product_name_snapshot) as product_name_snapshot,
      max(e.product_sku_snapshot) as product_sku_snapshot,
      max(e.product_color_snapshot) as product_color_snapshot,
      avg(u.product_price_snapshot) as product_price_avg,
      count(*) filter (where e.is_countable and e.traffic_type not in ('bot', 'internal')) as total_views,
      count(u.id) as unique_views
    from prop_refresh_events e
    left join prop_refresh_unique u on u.id = e.id
    where e.event_type = 'product_view'
      and e.created_at >= p_from
    group by 1, 2
  ), mode_values as (
    select (u.created_at at time zone 'UTC')::date metric_date, u.product_id, 'device' dimension, u.device_type value from prop_refresh_unique u where u.device_type is not null
    union all select (u.created_at at time zone 'UTC')::date, u.product_id, 'browser', u.browser_name from prop_refresh_unique u where u.browser_name is not null
    union all select (u.created_at at time zone 'UTC')::date, u.product_id, 'country', coalesce(u.country_code, u.country) from prop_refresh_unique u where coalesce(u.country_code, u.country) is not null
    union all select (u.created_at at time zone 'UTC')::date, u.product_id, 'region', u.region from prop_refresh_unique u where u.region is not null
    union all select (u.created_at at time zone 'UTC')::date, u.product_id, 'city', u.city from prop_refresh_unique u where u.city is not null
    union all select (u.created_at at time zone 'UTC')::date, u.product_id, 'source', u.source_platform from prop_refresh_unique u where u.source_platform is not null
  ), mode_counts as (
    select metric_date, product_id, dimension, value,
      row_number() over (partition by metric_date, product_id, dimension order by count(*) desc, value) as position
    from mode_values
    group by metric_date, product_id, dimension, value
  ), modes as (
    select metric_date, product_id,
      max(value) filter (where dimension = 'device' and position = 1) as top_device,
      max(value) filter (where dimension = 'browser' and position = 1) as top_browser,
      max(value) filter (where dimension = 'country' and position = 1) as top_country,
      max(value) filter (where dimension = 'region' and position = 1) as top_region,
      max(value) filter (where dimension = 'city' and position = 1) as top_city,
      max(value) filter (where dimension = 'source' and position = 1) as top_source_platform
    from mode_counts group by metric_date, product_id
  ), journeys as (
    select (e.created_at at time zone 'UTC')::date metric_date, e.product_id,
      count(*) filter (where e.event_type = 'session_end') as exit_count,
      count(*) filter (where e.event_type = 'session_end' and e.is_quick_bounce) as quick_bounce_count,
      count(*) filter (where e.event_type = 'journey' and e.next_page_type = 'product') as continue_product_count,
      count(*) filter (where e.event_type = 'journey' and e.next_page_type = 'collection') as continue_collection_count,
      count(*) filter (where e.event_type = 'journey' and e.next_page_type not in ('product', 'collection')) as continue_other_count
    from prop_refresh_events e
    where e.product_id is not null
      and e.created_at >= p_from
      and e.is_countable
      and e.traffic_type not in ('bot', 'internal')
      and e.event_type in ('session_end', 'journey')
    group by 1, 2
  ), active as (
    select (a.started_at at time zone 'UTC')::date metric_date, a.product_id,
      avg(a.active_seconds) as avg_active_seconds
    from public.algorithm_activity_intervals a
    join public.products p on p.id = a.product_id and p.category_id = 'prop'
    where a.started_at >= p_from and a.started_at < p_to
    group by 1, 2
  )
  select d.metric_date, d.product_id, d.collection_group_id, 'prop',
    d.product_category_snapshot, d.product_name_snapshot, d.product_sku_snapshot,
    d.product_color_snapshot, d.product_price_avg, d.total_views, d.unique_views,
    greatest(0, d.total_views - d.unique_views), coalesce(a.avg_active_seconds, 0),
    coalesce(j.exit_count, 0), coalesce(j.quick_bounce_count, 0),
    coalesce(j.continue_product_count, 0), coalesce(j.continue_collection_count, 0), coalesce(j.continue_other_count, 0),
    m.top_device, m.top_browser, m.top_country, m.top_region, m.top_city, m.top_source_platform
  from daily_views d
  left join modes m using (metric_date, product_id)
  left join journeys j using (metric_date, product_id)
  left join active a using (metric_date, product_id);

  delete from public.algorithm_viewer_profiles where range_days = p_range_days;

  insert into public.algorithm_viewer_profiles (
    identity_key, identity_type, user_id, visitor_id, range_days,
    first_seen_at, last_seen_at, sessions_count, page_views, unique_pages,
    product_views, unique_product_views, repeat_product_views, active_seconds,
    average_session_seconds, average_product_price, min_product_price, max_product_price,
    top_country, top_region, top_city, top_device, top_os, top_browser,
    first_touch_source, latest_session_source, persona_labels, persona_reasons,
    has_pre_login_history
  )
  with recent as (
    select * from prop_refresh_events where created_at >= p_from
  ), unique_views as (
    select * from prop_refresh_unique where created_at >= p_from
  ), stats as (
    select r.canonical_key,
      (array_agg(r.user_id order by r.created_at desc) filter (where r.user_id is not null))[1] as user_id,
      (array_agg(r.visitor_id order by r.created_at desc) filter (where r.visitor_id is not null))[1] as visitor_id,
      min(r.created_at) as first_seen_at, max(r.created_at) as last_seen_at,
      count(distinct r.session_id)::integer as sessions_count,
      (count(*) filter (where r.event_type = 'page_view'))::integer as page_views,
      (count(distinct r.page_path) filter (where r.page_path is not null))::integer as unique_pages,
      (count(*) filter (where r.event_type = 'product_view'))::integer as product_views,
      (count(distinct u.product_id) filter (where u.product_id is not null))::integer as unique_product_views,
      count(*) filter (where r.event_type = 'product_view') - count(distinct u.id)::integer as repeat_product_views,
      avg(u.product_price_snapshot) as average_product_price,
      min(u.product_price_snapshot) as min_product_price,
      max(u.product_price_snapshot) as max_product_price,
      bool_or(r.pre_login_event) as has_pre_login_history
    from recent r
    left join unique_views u on u.id = r.id
    group by r.canonical_key
  ), active as (
    select m.canonical_key, sum(coalesce(a.active_seconds, 0))::integer as active_seconds
    from (select distinct canonical_key, identity_key from recent) m
    join public.algorithm_activity_intervals a on a.identity_key = m.identity_key
    where a.started_at >= p_from and a.started_at < p_to
    group by m.canonical_key
  ), modes as (
    select r.canonical_key,
      (array_agg(coalesce(r.country_code, r.country) order by r.created_at desc) filter (where coalesce(r.country_code, r.country) is not null))[1] as top_country,
      (array_agg(r.region order by r.created_at desc) filter (where r.region is not null))[1] as top_region,
      (array_agg(r.city order by r.created_at desc) filter (where r.city is not null))[1] as top_city,
      (array_agg(r.device_type order by r.created_at desc) filter (where r.device_type is not null))[1] as top_device,
      (array_agg(r.os_name order by r.created_at desc) filter (where r.os_name is not null))[1] as top_os,
      (array_agg(r.browser_name order by r.created_at desc) filter (where r.browser_name is not null))[1] as top_browser,
      (array_agg(r.first_touch_source order by r.created_at asc) filter (where r.first_touch_source is not null))[1] as first_touch_source,
      (array_agg(r.session_source order by r.created_at desc) filter (where r.session_source is not null))[1] as latest_session_source
    from recent r group by r.canonical_key
  ), thresholds as (
    select percentile_cont(0.75) within group (order by average_product_price) as high_price
    from stats where average_product_price is not null
  )
  select s.canonical_key,
    case when s.user_id is not null then 'user' else 'visitor' end,
    s.user_id, case when s.user_id is null then s.visitor_id else null end, p_range_days, s.first_seen_at, s.last_seen_at,
    s.sessions_count, s.page_views, s.unique_pages, s.product_views, s.unique_product_views,
    greatest(0, s.repeat_product_views), coalesce(a.active_seconds, 0),
    case when s.sessions_count > 0 then round(coalesce(a.active_seconds, 0)::numeric / s.sessions_count, 2) else 0 end,
    s.average_product_price, s.min_product_price, s.max_product_price,
    m.top_country, m.top_region, m.top_city, m.top_device, m.top_os, m.top_browser,
    m.first_touch_source, m.latest_session_source,
    array_remove(array[
      case when s.unique_product_views >= 3 then 'มีข้อมูลสินค้าเพียงพอ' end,
      case when s.sessions_count >= 2 then 'ผู้ชมที่กลับมา' end,
      case when s.average_product_price is not null and s.average_product_price >= t.high_price and s.unique_product_views >= 3 then 'สนใจสินค้าราคาสูง' end,
      case when s.unique_product_views = 0 then 'ข้อมูลพฤติกรรมยังไม่พอ' end
    ], null),
    jsonb_build_object('unique_product_views', s.unique_product_views, 'sessions', s.sessions_count, 'average_product_price', s.average_product_price),
    coalesce(s.has_pre_login_history, false)
  from stats s
  left join active a using (canonical_key)
  left join modes m using (canonical_key)
  cross join thresholds t;

  get diagnostics v_personas = row_count;
  select count(*) into v_products from public.algorithm_product_daily_metrics
    where metric_date >= (p_from at time zone 'UTC')::date and metric_date <= (p_to at time zone 'UTC')::date;

  return jsonb_build_object('range_days', p_range_days, 'products', v_products, 'personas', v_personas, 'from', p_from, 'to', p_to);
end;
$$;

revoke all on function public.refresh_prop_analytics(timestamptz, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.refresh_prop_analytics(timestamptz, timestamptz, integer) to service_role;

comment on function public.refresh_prop_analytics(timestamptz, timestamptz, integer) is
  'Rebuilds Prop daily product metrics and range-based viewer profiles from raw events. Raw events are retained.';
