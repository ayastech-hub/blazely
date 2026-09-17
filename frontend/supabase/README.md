# Wallet authentication — setup

This folder fixes a real vulnerability found in a security audit: the app
was treating whatever wallet address `wagmi` reported as "connected" as
proof of identity, with no signature verification at all. Anyone with the
public anon key (present in every frontend bundle, by design) could call
the Supabase API directly and edit any profile, edit any token, or post
comments/follows as any wallet — no private key required.

The fix is Sign-In With Ethereum (SIWE / EIP-4361) via Supabase's native
Web3 Auth, plus Row Level Security policies that check a server-verified
wallet identity instead of a client-supplied one.

## What's in this folder

- `0001_wallet_auth_claim_hook.sql` — a Custom Access Token Hook that reads
  the verified wallet address off the user's web3 identity and stamps it
  onto their JWT as a `wallet_address` claim.
- `0002_wallet_rls_policies.sql` — enables RLS and adds policies on
  `users`, `tokens`, `comments`, `user_follow`, and `watchlist`, all keyed
  off that claim.
- `0003_wallet_rate_limiting.sql` — wallet-keyed rate limiting (comments
  today; add more actions the same way as new direct-write features ship).

## Bot protection — Cloudflare Turnstile

Rate limiting alone doesn't stop bots — it just throttles volume, and it's
easy to defeat by rotating IPs. Turnstile actually distinguishes human from
automated traffic (invisibly, for almost all real users — no CAPTCHA
puzzle). Supabase has native support for this on its Auth endpoints.

1. **Create a Turnstile site** — Cloudflare Dashboard → Turnstile → Add
   site. Use widget mode "Invisible". You'll get a **Site Key** (public)
   and a **Secret Key** (private).
2. **Set the site key in the frontend**: `VITE_TURNSTILE_SITE_KEY` in
   `.env` (see `.env.example`). This one is safe to expose — it's meant to
   be public.
3. **Set the secret key in Supabase** — Dashboard → Authentication →
   Attack Protection → Enable CAPTCHA protection → provider "Turnstile" →
   paste the Secret Key. **Never put the secret key in frontend code or
   env vars** — it only belongs here.
4. That's it on the Supabase side — once enabled, the `/token` endpoint
   (used by `src/lib/siweAuth.js`) verifies the token GoTrue-side
   automatically whenever one is included in the request.

**What Turnstile does *not* cover**: it only protects the sign-in step.
Rate limiting (`0003`, above) is what protects already-authenticated
actions like posting comments from being spammed by a signed-in bot.

## Bot/abuse protection Postgres genuinely can't do — put this at your CDN

Postgres and RLS have no reliable view of a request's real client IP (they
see Supabase's connection pooler, not the visitor), so true **IP-based**
rate limiting and DDoS protection belong at the edge, not in SQL:

- If you put **Cloudflare** in front of your hosting (Netlify/Vercel), its
  free tier includes Bot Fight Mode and basic WAF/rate-limit rules — this
  is the right place for "block this IP if it's hammering the site."
- Netlify and Vercel also have their own rate-limiting/firewall features on
  paid plans if you'd rather not add Cloudflare as a separate layer.

This is an infrastructure/dashboard setup, not a code change — nothing in
this repo can configure it for you.

## Setup steps (in order — the SQL alone is not enough)

1. **Install the Supabase CLI** if you don't have it:
   `npm install -g supabase`

2. **Link this project** to your Supabase project (one-time):
   ```
   supabase link --project-ref <your-project-ref>
   ```
   Your project ref is in the Supabase dashboard URL:
   `https://supabase.com/dashboard/project/<project-ref>`

3. **Run the migrations**:
   ```
   supabase db push
   ```
   This applies both SQL files in order.

4. **Enable the Web3 (Ethereum) auth provider** — Dashboard → Authentication
   → Providers → Web3 → toggle Ethereum on. Nothing works without this;
   Supabase rejects the sign-in request entirely until it's enabled.

5. **Enable the Custom Access Token Hook** — Dashboard → Authentication →
   Hooks → "Customize Access Token (JWT) Claims" → enable → select
   `public.custom_access_token_hook` as the function. Without this step,
   users can still sign in, but their JWT won't carry the `wallet_address`
   claim, and every RLS policy that depends on it will deny all writes
   (fails safe, not open — see the note in 0002 about `jwt_wallet_address()`
   returning an empty string when the claim is missing).

6. **Set these two env vars** in the frontend (`.env` — see `.env.example`),
   if not already set: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. The
   new `src/lib/siweAuth.js` module calls the Supabase Auth REST API
   directly with these, in addition to the existing `supabase-js` client.

## How to verify it actually worked

After connecting a wallet and signing the SIWE prompt in the app:

1. In the Supabase Dashboard → Authentication → Users, you should see a new
   user with a **Web3** identity provider.
2. Run this in the SQL Editor to confirm the claim is present:
   ```sql
   select raw_app_meta_data, raw_user_meta_data
   from auth.users
   order by created_at desc
   limit 1;
   ```
   (This shows stored metadata, not the JWT itself — to check the JWT claim,
   decode an access token from the browser's network tab at
   https://jwt.io and confirm `wallet_address` is present and lowercase.)
3. Try editing a token you don't own by calling the Supabase client
   directly from the browser console — it should now fail with an RLS
   policy violation instead of silently succeeding.

## Adding more chains later

Nothing here needs to change. Supabase's `chain` parameter in the web3
grant is the chain *family* ("ethereum" covers every EVM network — mainnet,
Sepolia, Base, Optimism, etc.), and the specific network is carried inside
the signed SIWE message itself. Add a new EVM chain to
`src/config/wagmi.js`'s `chains` array and it works automatically — the
message's `Chain ID:` field just reflects whichever chain the wallet is
connected to at sign-in time. (A non-EVM chain such as Solana would need a
different `chain` value and a different signing method in
`src/lib/siweAuth.js` — that's a real, separate piece of work, not covered
by this migration.)

## Honest limitations / things to verify yourself

- The exact JSON shape Supabase stores in `auth.identities.identity_data`
  for web3 identities isn't something I could verify against a live
  project from here — the hook in 0001 relies on `provider_id` instead
  (documented format: `web3:{chain}:{address}`), which is the more
  reliably-documented field, but confirm it against your own project's
  data after the first real sign-in (step 2 above).
- I did not have credentials to your actual Supabase project and could not
  run or test any of this myself — everything here is written against
  Supabase's official documentation, not verified against a live database.
  Test it in a staging project before relying on it in production.
