-- supabase/migrations/0002_wallet_rls_policies.sql
--
-- Row Level Security for every table the frontend writes to directly.
-- Requires migration 0001 (the wallet_address JWT claim hook) to actually
-- be enabled in the dashboard — see supabase/README.md. Until it is, the
-- `public.jwt_wallet_address()` helper below returns NULL for everyone,
-- and every write policy that depends on it will correctly deny all writes
-- rather than silently falling back to trusting client input.
--
-- SECURITY CONTEXT (see the audit that motivated this):
-- Before this migration, application code filtered writes by a `wallet`
-- value read from React state (wagmi's reported "connected" address, which
-- requires no proof of key ownership) — e.g.
--   supabase.from("tokens").update(fields).eq("address", tokenAddress)
-- with zero check that the caller's wallet matched that token's creator.
-- Anyone with the public anon key (shipped in every frontend bundle, by
-- design) could call the exact same query directly and edit ANY token, any
-- profile, or post comments/follows as any wallet. RLS is what actually
-- closes that — the policies below are enforced by Postgres itself,
-- regardless of what the client sends or which code path calls the API.

-- Small helper so every policy reads the same way and only needs
-- `public.jwt_wallet_address()` to be right in one place.
create or replace function public.jwt_wallet_address()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'wallet_address', ''))
$$;

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
alter table public.users enable row level security;

drop policy if exists "users_public_read" on public.users;
create policy "users_public_read"
  on public.users for select
  using (true); -- profiles are public — anyone can view any profile

drop policy if exists "users_owner_insert" on public.users;
create policy "users_owner_insert"
  on public.users for insert
  with check (lower(wallet) = public.jwt_wallet_address());

drop policy if exists "users_owner_update" on public.users;
create policy "users_owner_update"
  on public.users for update
  using (lower(wallet) = public.jwt_wallet_address())
  with check (lower(wallet) = public.jwt_wallet_address());

-- ---------------------------------------------------------------------
-- tokens
-- Row creation stays reserved for the backend indexer (which uses the
-- service_role key and bypasses RLS entirely, as it already does today) —
-- no insert policy is granted to authenticated/anon here on purpose.
-- Editing an existing token's details (name/description/logo/socials) is
-- the exact vulnerability from the audit: previously any wallet could edit
-- any token by calling the API directly. Now only the verified creator can.
-- ---------------------------------------------------------------------
alter table public.tokens enable row level security;

drop policy if exists "tokens_public_read" on public.tokens;
create policy "tokens_public_read"
  on public.tokens for select
  using (true);

drop policy if exists "tokens_creator_update" on public.tokens;
create policy "tokens_creator_update"
  on public.tokens for update
  using (lower(creator_wallet) = public.jwt_wallet_address())
  with check (lower(creator_wallet) = public.jwt_wallet_address());

-- ---------------------------------------------------------------------
-- comments
-- Previously anyone could insert a comment "as" any wallet by supplying
-- any user_wallet value. Now the inserted row must match the verified
-- caller.
-- ---------------------------------------------------------------------
alter table public.comments enable row level security;

drop policy if exists "comments_public_read" on public.comments;
create policy "comments_public_read"
  on public.comments for select
  using (true);

drop policy if exists "comments_author_insert" on public.comments;
create policy "comments_author_insert"
  on public.comments for insert
  with check (lower(user_wallet) = public.jwt_wallet_address());

-- ---------------------------------------------------------------------
-- user_follow
-- You can only create/modify a follow relationship where YOU are the
-- follower (user_wallet) — you can't force yourself into someone else's
-- following list, and you can't spoof following as another wallet.
-- ---------------------------------------------------------------------
alter table public.user_follow enable row level security;

drop policy if exists "user_follow_public_read" on public.user_follow;
create policy "user_follow_public_read"
  on public.user_follow for select
  using (true); -- follower/following counts are public

drop policy if exists "user_follow_owner_insert" on public.user_follow;
create policy "user_follow_owner_insert"
  on public.user_follow for insert
  with check (lower(user_wallet) = public.jwt_wallet_address());

drop policy if exists "user_follow_owner_update" on public.user_follow;
create policy "user_follow_owner_update"
  on public.user_follow for update
  using (lower(user_wallet) = public.jwt_wallet_address())
  with check (lower(user_wallet) = public.jwt_wallet_address());

-- ---------------------------------------------------------------------
-- watchlist
-- Unlike follows, nothing in the app currently shows another wallet's
-- watchlist, so this is locked down to owner-only for read and write —
-- tighter than strictly required today, but matches actual usage and
-- errs toward privacy for a personal watchlist.
-- ---------------------------------------------------------------------
alter table public.watchlist enable row level security;

drop policy if exists "watchlist_owner_all" on public.watchlist;
create policy "watchlist_owner_all"
  on public.watchlist for all
  using (lower(user_wallet) = public.jwt_wallet_address())
  with check (lower(user_wallet) = public.jwt_wallet_address());
