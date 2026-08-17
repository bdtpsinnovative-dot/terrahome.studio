-- Keep the Prop recommendation weights aligned with the agreed ranking rules.
-- Candidates still must share the same product type or collection group.

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
    order by e.product_id, coalesce(l.user_key, e.identity_key), e.view_bucket, e.created_at desc
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
      -- Agreed recommendation weights:
      -- colour/tone +4, product type +5, collection +1,
      -- followed by browsing behaviour, recent views and stock.
      case when cardinality(cc.color_tokens) > 0 and cardinality(c.color_tokens) > 0
          and c.color_tokens && cc.color_tokens then 4.0 else 0 end
      + case when c.product_type = cc.product_type and c.product_type <> '' then 5.0 else 0 end
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
  'Prop recommendations use colour/tone +4, product type +5, collection +1, browsing sequence, recent engagement and stock.';
