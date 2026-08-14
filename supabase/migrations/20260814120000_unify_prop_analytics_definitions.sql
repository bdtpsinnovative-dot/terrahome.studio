-- Unify the Prop analytics read models.
--
-- Raw events remain untouched. This migration only makes the derived readers
-- use the same rules as the Admin UI: Prop scope, countable traffic, a
-- canonical viewer identity, snapshot values, and one active interval per
-- page instance.

create index if not exists algorithm_events_prop_product_created_idx
  on public.algorithm_events (product_id, created_at desc)
  where source_tag = 'prop' and event_type = 'product_view';

create index if not exists algorithm_events_prop_identity_created_idx
  on public.algorithm_events (identity_key, created_at asc)
  where source_tag = 'prop';

create or replace function public.get_prop_related_products(
  current_product_id bigint,
  limit_count integer default 16
)
returns table (
  product_id bigint,
  score numeric,
  sequential_views bigint,
  category_views bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with viewer_links as (
    select distinct
      'visitor:' || (e.metadata->>'linked_visitor_id') as visitor_key,
      'user:' || e.user_id::text as user_key
    from public.algorithm_events e
    where e.source_tag = 'prop'
      and e.identity_type = 'user'
      and e.user_id is not null
      and e.metadata ? 'linked_visitor_id'
  ), product_attributes as (
    select
      p.id,
      p.collection_group_id,
      lower(regexp_replace(trim(coalesce(cg.product_sup, '')), '\s+', ' ', 'g')) as product_type,
      coalesce(color_tokens.values, '{}'::text[]) as color_tokens
    from public.products p
    join public.collection_groups cg on cg.id = p.collection_group_id
    cross join lateral (
      select coalesce(
        nullif(to_jsonb(p.color), 'null'::jsonb),
        nullif(p.specs->'color', 'null'::jsonb),
        nullif(p.specs->'colour', 'null'::jsonb),
        nullif(p.specs->'colors', 'null'::jsonb),
        nullif(p.specs->'colours', 'null'::jsonb),
        nullif(p.specs->'tone', 'null'::jsonb),
        nullif(p.specs->'color_tone', 'null'::jsonb),
        nullif(p.specs->'colour_tone', 'null'::jsonb),
        nullif(p.specs->'colorTone', 'null'::jsonb)
      ) as color_json
    ) color_source
    cross join lateral (
      select coalesce(
        array_agg(distinct normalized.value) filter (where normalized.value <> ''),
        '{}'::text[]
      ) as values
      from (
        select regexp_replace(lower(trim(split_value.token)), '\s+', ' ', 'g') as value
        from jsonb_array_elements_text(
          case
            when jsonb_typeof(color_source.color_json) = 'array' then color_source.color_json
            when jsonb_typeof(color_source.color_json) in ('string', 'number', 'boolean')
              then jsonb_build_array(color_source.color_json)
            else '[]'::jsonb
          end
        ) raw_value(value)
        cross join lateral regexp_split_to_table(raw_value.value, '[,/|]') as split_value(token)
      ) normalized
    ) color_tokens
    where p.category_id = 'prop'
      and cg.tag ilike '%prop%'
  ),
  current_context as (
    select pa.collection_group_id, pa.product_type, pa.color_tokens
    from product_attributes pa
    where pa.id = current_product_id
    limit 1
  ),
  next_product_events as (
    select e.product_id, count(*)::bigint as sequential_views,
      sum(power(0.5, greatest(0, extract(epoch from (now() - e.created_at)) / 86400.0) / 7.0)) as sequential_score
    from public.algorithm_events e
    join product_attributes pa on pa.id = e.product_id
    where e.source_tag = 'prop'
      and e.event_type = 'product_view'
      and e.is_countable = true
      and e.traffic_type not in ('bot', 'internal')
      and e.session_id is not null
      and e.previous_product_id = current_product_id
      and e.product_id <> current_product_id
      and e.created_at >= now() - interval '30 days'
    group by e.product_id
  ),
  category_unique_events as (
    select distinct on (e.product_id, coalesce(l.user_key, e.identity_key), e.view_bucket)
      e.product_id, coalesce(l.user_key, e.identity_key) as identity_key, e.view_bucket, e.created_at
    from public.algorithm_events e
    join product_attributes pa on pa.id = e.product_id
    left join viewer_links l on l.visitor_key = e.identity_key
    where e.source_tag = 'prop'
      and e.event_type = 'product_view'
      and e.is_countable = true
      and e.traffic_type not in ('bot', 'internal')
      and e.created_at >= now() - interval '30 days'
    order by e.product_id, e.identity_key, e.view_bucket, e.created_at desc
  ),
  category_product_events as (
    select e.product_id, count(*)::bigint as category_views,
      sum(power(0.5, greatest(0, extract(epoch from (now() - e.created_at)) / 86400.0) / 7.0)) as category_score
    from category_unique_events e
    group by e.product_id
  ),
  candidates as (
    select pa.id as product_id, pa.collection_group_id, pa.product_type, pa.color_tokens,
      coalesce(sum(s.qty), 0) as stock_total
    from product_attributes pa
    cross join current_context cc
    left join public.stock s on s.product_id = pa.id
    where pa.id <> current_product_id
      and (pa.product_type = cc.product_type or pa.collection_group_id = cc.collection_group_id)
    group by pa.id, pa.collection_group_id, pa.product_type, pa.color_tokens
  )
  select c.product_id,
    (
      case when c.product_type = cc.product_type and c.product_type <> '' then 5.0 else 0 end
      + case when cardinality(cc.color_tokens) > 0 and cardinality(c.color_tokens) > 0
          and c.color_tokens && cc.color_tokens then 4.0 else 0 end
      + case when c.collection_group_id = cc.collection_group_id then 1.0 else 0 end
      + coalesce(next_events.sequential_score, 0) * 3.0
      + coalesce(category_events.category_score, 0) * 0.5
    ) * case when c.stock_total > 0 then 1.0 else 0.6 end as score,
    coalesce(next_events.sequential_views, 0) as sequential_views,
    coalesce(category_events.category_views, 0) as category_views
  from candidates c
  cross join current_context cc
  left join next_product_events next_events on next_events.product_id = c.product_id
  left join category_product_events category_events on category_events.product_id = c.product_id
  order by score desc, sequential_views desc, category_views desc, c.product_id
  limit greatest(1, least(limit_count, 100));
$$;

comment on function public.get_prop_related_products(bigint, integer) is
  'Prop recommendations use products.color/specs, same product type, countable traffic and stock-aware sequence signals.';

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
  select e.*, coalesce(l.user_key, e.identity_key) as canonical_key,
    (l.user_key is not null and e.identity_type = 'visitor') as pre_login_event
  from public.algorithm_events e
  left join public.products p on p.id = e.product_id
  left join public.collection_groups cg on cg.id = p.collection_group_id
  left join links l on l.visitor_key = e.identity_key
  where e.source_tag = 'prop'
    and e.created_at >= p_from - interval '24 hours'
    and e.created_at < p_to
    and (e.product_id is null or (p.category_id = 'prop' and cg.tag ilike '%prop%'));

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
      select 1 from prop_refresh_events previous
      where previous.event_type = 'product_view'
        and previous.is_countable = true
        and previous.traffic_type not in ('bot', 'internal')
        and previous.canonical_key = e.canonical_key
        and previous.product_id = e.product_id
        and previous.created_at >= e.created_at - interval '24 hours'
        and (previous.created_at < e.created_at or (previous.created_at = e.created_at and previous.id < e.id))
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
    select (e.created_at at time zone 'UTC')::date as metric_date, e.product_id,
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
    where e.event_type = 'product_view' and e.created_at >= p_from
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
    from mode_values group by metric_date, product_id, dimension, value
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
    where e.product_id is not null and e.created_at >= p_from
      and e.is_countable and e.traffic_type not in ('bot', 'internal')
      and e.event_type in ('session_end', 'journey')
    group by 1, 2
  ), active_by_opening as (
    select (a.started_at at time zone 'UTC')::date metric_date, a.product_id,
      a.session_id, a.page_instance_id, max(a.active_seconds) as active_seconds
    from public.algorithm_activity_intervals a
    join public.products p on p.id = a.product_id and p.category_id = 'prop'
    where a.started_at >= p_from and a.started_at < p_to
      and exists (
        select 1 from prop_refresh_events e
        where e.session_id = a.session_id and e.is_countable and e.traffic_type not in ('bot', 'internal')
      )
    group by 1, 2, 3, 4
  ), active as (
    select metric_date, product_id, avg(active_seconds) as avg_active_seconds
    from active_by_opening group by 1, 2
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
    select * from prop_refresh_events
    where created_at >= p_from and is_countable and traffic_type not in ('bot', 'internal')
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
      bool_or(r.pre_login_event) as has_pre_login_history,
      bool_or(r.event_type = 'cta') as has_cta
    from recent r
    left join unique_views u on u.id = r.id
    group by r.canonical_key
  ), active_by_opening as (
    select m.canonical_key, a.session_id, a.page_instance_id, max(a.active_seconds) as active_seconds
    from (select distinct canonical_key, identity_key, session_id from recent) m
    join public.algorithm_activity_intervals a on a.identity_key = m.identity_key and a.session_id = m.session_id
    where a.started_at >= p_from and a.started_at < p_to
    group by m.canonical_key, a.session_id, a.page_instance_id
  ), active as (
    select canonical_key, sum(active_seconds)::integer as active_seconds
    from active_by_opening group by canonical_key
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
    s.user_id, case when s.user_id is null then s.visitor_id else null end, p_range_days,
    s.first_seen_at, s.last_seen_at, s.sessions_count, s.page_views, s.unique_pages,
    s.product_views, s.unique_product_views, greatest(0, s.repeat_product_views), coalesce(a.active_seconds, 0),
    case when s.sessions_count > 0 then round(coalesce(a.active_seconds, 0)::numeric / s.sessions_count, 2) else 0 end,
    s.average_product_price, s.min_product_price, s.max_product_price,
    m.top_country, m.top_region, m.top_city, m.top_device, m.top_os, m.top_browser,
    m.first_touch_source, m.latest_session_source,
    array_remove(array[
      case when s.unique_product_views >= 3 then 'ผู้ชมมีส่วนร่วมสูง' end,
      case when s.sessions_count >= 3 then 'เข้าเว็บบ่อย' end,
      case when s.average_product_price is not null and s.average_product_price >= t.high_price and s.unique_product_views >= 3 then 'สนใจสินค้าราคาสูง' end,
      case when s.has_cta then 'มีความสนใจสูง' end,
      case when s.unique_product_views = 0 then 'ยังจำแนกไม่ได้' end
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
