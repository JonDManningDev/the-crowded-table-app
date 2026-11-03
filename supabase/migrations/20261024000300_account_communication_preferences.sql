-- Global account preference only; community messaging remains separately planned.
alter table public.user_accounts
  add column allow_direct_messages boolean not null default true;

grant update(allow_direct_messages) on public.user_accounts to authenticated;
