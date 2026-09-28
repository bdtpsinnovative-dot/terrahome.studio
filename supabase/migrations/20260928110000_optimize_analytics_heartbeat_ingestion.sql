-- Optimize analytics event ingestion:
-- 1. Skip writing raw heartbeat events to algorithm_events to stop log bloat and excessive row creation.
-- 2. Allow activity intervals to be recorded/finalized on journey and session_end events.

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

  -- Skip inserting raw heartbeat events into algorithm_events to eliminate log ingestion bloat
  if v_event_type <> 'session_heartbeat' then
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
  end if;

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
  elsif (v_event_type = 'session_heartbeat' or v_event_type = 'journey' or v_event_type = 'session_end') and v_activity_interval_id is not null then
    insert into public.algorithm_activity_intervals (
      id, session_id, page_instance_id, identity_key, identity_type, user_id, visitor_id,
      page_type, page_path, product_id, started_at, last_heartbeat_at, active_seconds
    ) values (
      v_activity_interval_id, v_session_id, coalesce(v_page_instance_id, gen_random_uuid()), v_identity_key, v_identity_type,
      case when v_identity_type = 'user' then v_user_id else null end,
      case when v_identity_type = 'visitor' then v_visitor_id else null end,
      coalesce(v_page_type, 'unknown'), coalesce(v_page_path, '/'), v_product_id, now(), now(), v_active_seconds
    ) on conflict (id) do update set
      last_heartbeat_at = now(),
      active_seconds = greatest(algorithm_activity_intervals.active_seconds, excluded.active_seconds);

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
  end if;

  if v_event_type = 'session_end' then
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

revoke all on function public.record_prop_analytics_event(jsonb) from public;
grant execute on function public.record_prop_analytics_event(jsonb) to anon, authenticated, service_role;
