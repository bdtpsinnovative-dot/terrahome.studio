-- Context needed to learn product-to-product browsing transitions.
alter table if exists public.algorithm_events
  add column if not exists session_id uuid,
  add column if not exists previous_product_id bigint;

create index if not exists algorithm_events_session_sequence_idx
  on public.algorithm_events (session_id, created_at desc)
  where event_type = 'product_view' and source_tag = 'prop';

create index if not exists algorithm_events_transition_idx
  on public.algorithm_events (previous_product_id, product_id, created_at desc)
  where event_type = 'product_view' and is_countable = true and source_tag = 'prop';

-- Rank products that people view immediately after the current product, then
-- use same-category engagement as the cold-start fallback. No random ordering.
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
  with current_context as (
    select
      p.collection_group_id,
      cg.product_sup
    from public.products p
    join public.collection_groups cg on cg.id = p.collection_group_id
    where p.id = current_product_id
      and cg.tag ilike '%prop%'
    limit 1
  ),
  next_product_events as (
    select
      e.product_id,
      count(*)::bigint as sequential_views,
      sum(
        power(
          0.5,
          greatest(0, extract(epoch from (now() - e.created_at)) / 86400.0) / 7.0
        )
      ) as sequential_score
    from public.algorithm_events e
    where e.source_tag = 'prop'
      and e.event_type = 'product_view'
      and e.is_countable = true
      and e.session_id is not null
      and e.previous_product_id = current_product_id
      and e.product_id <> current_product_id
      and e.created_at >= now() - interval '30 days'
    group by e.product_id
  ),
  category_unique_events as (
    select distinct on (e.product_id, e.identity_key, e.view_bucket)
      e.product_id,
      e.identity_key,
      e.view_bucket,
      e.created_at
    from public.algorithm_events e
    where e.source_tag = 'prop'
      and e.event_type = 'product_view'
      and e.is_countable = true
      and e.created_at >= now() - interval '30 days'
    order by e.product_id, e.identity_key, e.view_bucket, e.created_at desc
  ),
  category_product_events as (
    select
      e.product_id,
      count(*)::bigint as category_views,
      sum(
        power(
          0.5,
          greatest(0, extract(epoch from (now() - e.created_at)) / 86400.0) / 7.0
        )
      ) as category_score
    from category_unique_events e
    group by e.product_id
  ),
  candidates as (
    select
      p.id as product_id,
      coalesce(sum(s.qty), 0) as stock_total
    from public.products p
    join public.collection_groups cg on cg.id = p.collection_group_id
    cross join current_context cc
    left join public.stock s on s.product_id = p.id
    where p.id <> current_product_id
      and (p.status = 'active' or p.status is null)
      and cg.tag ilike '%prop%'
      and (
        cg.product_sup = cc.product_sup
        or p.collection_group_id = cc.collection_group_id
      )
    group by p.id
  )
  select
    c.product_id,
    (
      coalesce(next_events.sequential_score, 0) * 3.0
      + coalesce(category_events.category_score, 0) * 0.5
    ) * case when c.stock_total > 0 then 1.0 else 0.6 end as score,
    coalesce(next_events.sequential_views, 0) as sequential_views,
    coalesce(category_events.category_views, 0) as category_views
  from candidates c
  left join next_product_events next_events on next_events.product_id = c.product_id
  left join category_product_events category_events on category_events.product_id = c.product_id
  order by score desc, sequential_views desc, category_views desc, c.product_id
  limit greatest(1, least(limit_count, 100));
$$;

revoke all on function public.get_prop_related_products(bigint, integer) from public, anon, authenticated;
grant execute on function public.get_prop_related_products(bigint, integer) to anon, authenticated, service_role;
