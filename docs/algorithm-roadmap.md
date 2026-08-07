# Prop algorithm roadmap

## Implemented in this change

- Raw `product_view` events in `public.algorithm_events`.
- Server-enriched IP HMAC, proxy/CDN location fields, user agent and referrer.
- Login identity via `user_id`; anonymous identity via a first-party `prop_visitor_id` cookie.
- Prop-only validation through `collection_groups.tag ILIKE '%prop%'` and the product/group relationship.
- 24-hour identity/product buckets and a 30-day Hot Item score with a 7-day half-life.
- An aggregate-only Hot Item RPC/API path for the Prop page and future admin site.
- Related Product recommendations ranked by matching product type and colour/tone, then session transitions (`A -> B`), engagement and stock.
- Prop products with zero stock shown as `PRE-ORDER`, sorted after available products.

## Optional deployment configuration

The feature runs without adding any environment variables. These optional variables improve classification and privacy:

```text
ALGORITHM_IP_HMAC_SECRET=<long random secret>
ALGORITHM_INTERNAL_CIDRS=<comma-separated office IPv4 CIDRs>
```

If `ALGORITHM_IP_HMAC_SECRET` is omitted, the server uses a stable non-secret SHA-256 fallback. If `ALGORITHM_INTERNAL_CIDRS` is omitted, internal-network classification stays disabled. Do not prefix either variable with `NEXT_PUBLIC_`.

## Follow-up work

1. Create `algorithm_product_daily` when event volume makes raw-event ranking expensive.
2. Add admin API filters for date range, country/region/city, ISP/ASN, internal traffic and bot traffic.
3. Add a managed CIDR table instead of environment-only internal-network rules.
4. Add a stronger bot/rate-limit strategy and monitoring for event abuse.
5. Add a dedicated pre-order field if the business later needs pre-order dates, deposits or ordering workflow.
