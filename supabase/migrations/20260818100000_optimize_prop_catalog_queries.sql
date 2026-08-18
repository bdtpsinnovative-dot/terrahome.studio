-- The catalog is shared by multiple sites. These indexes only improve lookup
-- speed; the application must still enforce products.category_id = 'prop'.

create extension if not exists pg_trgm;

-- Supports the existing collection-group scope filter without a sequential
-- scan when tags contain the word "prop".
create index if not exists collection_groups_tag_trgm_idx
  on public.collection_groups using gin (tag gin_trgm_ops);

-- Supports the two-step Prop catalog lookup by category and group.
create index if not exists products_category_collection_group_idx
  on public.products (category_id, collection_group_id);
