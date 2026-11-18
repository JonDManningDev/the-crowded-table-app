begin;

-- The legacy community_landing SQL projection was explicitly retired in
-- 20261110000700. Current landing/settings projections are API-owned. No live
-- function, view, policy or trigger consumes these columns. RESTRICT fails on
-- unexpected dependencies rather than removing any additional object.
-- PostgreSQL removes only each column's default and column-specific ACL with
-- the column; retained settings, table grants, RLS and historical audit JSON
-- remain untouched. There are no replacement controls or compatibility paths.
alter table public.tenant_settings
  drop column allow_public_chat_visibility restrict,
  drop column allow_public_activity_visibility restrict;

commit;
