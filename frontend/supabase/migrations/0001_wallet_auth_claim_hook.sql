-- supabase/migrations/0001_wallet_auth_claim_hook.sql
--
-- Adds a Custom Access Token Hook that injects the authenticated user's
-- wallet address into their JWT as a `wallet_address` claim.
--
-- WHY THIS EXISTS
-- Supabase's native Web3 Auth (https://supabase.com/docs/guides/auth/auth-web3)
-- verifies a signed SIWE (EIP-4361) message server-side and creates a real
-- auth.users row + an auth.identities row for the wallet. The wallet address
-- itself is stored in auth.identities.provider_id in the documented format
-- `web3:{chain}:{address}` — it is NOT automatically added to the JWT as its
-- own claim. Every RLS policy in this project needs a reliable way to check
-- "does this request's verified identity match this row's wallet column?",
-- so this hook does that extraction once, in one place, and stamps a plain
-- `wallet_address` claim onto every JWT Supabase issues.
--
-- HOW TO ENABLE (this SQL alone is not enough — Supabase requires the hook
-- to be turned on explicitly):
--   1. Run this migration (see supabase/README.md for how).
--   2. In the Supabase Dashboard: Authentication → Hooks (Beta) →
--      "Customize Access Token (JWT) Claims" → enable it → select
--      `public.custom_access_token_hook` as the Postgres function to call.
--   3. Enable the Web3 (Ethereum) auth provider: Authentication → Providers
--      → Web3 → Ethereum → enable.
-- Until both of those dashboard steps are done, this function exists but
-- Supabase will not call it, and JWTs won't carry the wallet_address claim.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  wallet_provider_id text;
  extracted_address text;
begin
  claims := event->'claims';

  -- A single auth.users row can in principle have more than one identity;
  -- we only care about the web3 one. provider_id format is documented as
  -- `web3:{chain}:{address}` — split_part is a straightforward, reliable
  -- way to pull the address (3rd colon-separated segment) out of that.
  select provider_id
    into wallet_provider_id
    from auth.identities
   where user_id = (event->>'user_id')::uuid
     and provider = 'web3'
   limit 1;

  if wallet_provider_id is not null then
    extracted_address := split_part(wallet_provider_id, ':', 3);
    if extracted_address is not null and extracted_address <> '' then
      claims := jsonb_set(claims, '{wallet_address}', to_jsonb(lower(extracted_address)));
    end if;
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Supabase's auth server (not any application role) is the only caller of
-- this function. Lock it down accordingly.
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

-- The hook needs to read auth.identities; grant only the narrow SELECT
-- needed, not broad access to the auth schema.
grant usage on schema auth to supabase_auth_admin;
grant select on auth.identities to supabase_auth_admin;
