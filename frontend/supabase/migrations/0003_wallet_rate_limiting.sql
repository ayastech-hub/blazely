-- supabase/migrations/0003_wallet_rate_limiting.sql
--
-- Rate limiting keyed to the verified wallet_address JWT claim (from
-- migration 0001), not IP address. This is deliberate, not an oversight:
--
-- Plain Postgres/RLS has no reliable access to a request's real client IP
-- (it sees Supabase's own connection pooler, not the visitor) — meaningful
-- IP-based rate limiting belongs at the edge/CDN layer (Cloudflare, or your
-- hosting provider's WAF), not in application SQL. See supabase/README.md
-- for what to do there.
--
-- What Postgres *can* enforce reliably is a limit per verified identity,
-- and for this app that's arguably the better signal anyway: IP-based
-- limits are trivially defeated by rotating through proxies, while
-- wallet-based limits are tied to the cost of controlling many distinct
-- signed-in wallets (each requiring its own signature to authenticate at
-- all, per migrations 0001/0002 — and Cloudflare Turnstile in front of
-- that sign-in step, see src/lib/turnstile.js).
--
-- This migration covers comments (the one direct-write, unauthenticated
-- -action-adjacent path in the app today). Add more actions the same way
-- as new direct-write features ship — the bounty board, for instance, is
-- still a UI-only mock (see lib/mockContractFunctions.js) and has no real
-- table to attach this to yet.

create table if not exists public.rate_limit_log (
  id bigint generated always as identity primary key,
  wallet_address text not null,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_log_lookup_idx
  on public.rate_limit_log (wallet_address, action, created_at desc);

-- Old rows are only useful for the lookback window checks below; nothing
-- reads them after that, so keep the table small.
create or replace function public.prune_rate_limit_log()
returns void
language sql
as $$
  delete from public.rate_limit_log where created_at < now() - interval '1 day';
$$;

-- Raises an exception (aborting the calling statement/transaction) if the
-- current verified wallet has made more than `max_count` attempts at
-- `action` within the last `window_seconds`. Call this from a BEFORE
-- INSERT trigger, not directly from application code — that way it's
-- enforced no matter what calls the table (frontend, a future backend
-- service, direct API calls), not just the one code path that happens to
-- call it today.
create or replace function public.enforce_rate_limit(action text, max_count int, window_seconds int)
returns void
language plpgsql
as $$
declare
  wallet text := public.jwt_wallet_address();
  recent_count int;
begin
  if wallet = '' then
    raise exception 'Rate limit check requires an authenticated wallet.';
  end if;

  select count(*) into recent_count
    from public.rate_limit_log
   where wallet_address = wallet
     and rate_limit_log.action = enforce_rate_limit.action
     and created_at > now() - make_interval(secs => window_seconds);

  if recent_count >= max_count then
    raise exception 'Rate limit exceeded for %: max % per % seconds.', action, max_count, window_seconds
      using errcode = 'P0001';
  end if;

  insert into public.rate_limit_log (wallet_address, action) values (wallet, action);
end;
$$;

-- ---------------------------------------------------------------------
-- comments: max 5 per wallet per 60 seconds — generous enough for genuine
-- back-and-forth discussion, tight enough to stop a scripted spam loop.
-- Adjust the two numbers below if that turns out wrong in practice.
-- ---------------------------------------------------------------------
create or replace function public.comments_rate_limit_trigger()
returns trigger
language plpgsql
as $$
begin
  perform public.enforce_rate_limit('post_comment', 5, 60);
  return new;
end;
$$;

drop trigger if exists comments_rate_limit on public.comments;
create trigger comments_rate_limit
  before insert on public.comments
  for each row
  execute function public.comments_rate_limit_trigger();
