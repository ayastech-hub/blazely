// src/hooks/profileQueries.js
//
// Shared read/write query functions for profile data. Both useProfileData
// (the connected user's own profile) and usePublicProfileData (viewing
// someone else's profile) call into these instead of duplicating fetch
// logic. This is also the one place unit conversion happens — per the
// indexer's unit reference:
//   - token_metrics_latest.price / market_cap / volume_total -> wei, /1e18
//   - token_metrics_latest.price_usd -> 8-decimal fixed point, /1e8
//   - token_holder_balances.balance -> fine-unit (18 decimals), /1e18
//   - tokens.decimals is always 18 in this schema
//   - transactions.token_amount / eth_amount are TEXT wei-scale integers —
//     converted separately via utils/format.js's formatUnits (BigInt-based)
//     at render time, not here
//   - transactions.usd_value / price_source are never written by the
//     indexer and are always NULL — never relied on as a primary value

import * as supabaseClient from "../lib/supabaseClient";
import { resolveLogoUrl, fromBaseUnits } from "../utils/formatProfile";

export const supabase = supabaseClient.supabase ?? supabaseClient.default ?? supabaseClient;

export const TX_PAGE_SIZE = 25;

/** Read-only user row lookup — does NOT create a row. Safe to call when
 * viewing someone else's profile; only the owner's session should upsert. */
export async function fetchUserRow(wallet) {
  const { data, error } = await supabase.from("users").select("*").eq("wallet", wallet).maybeSingle();
  if (error) throw error;
  return data;
}

/** Creates the row if missing — only ever called for the connected wallet's own profile. */
export async function ensureUserRow(wallet) {
  const { data, error } = await supabase
    .from("users")
    .upsert({ wallet }, { onConflict: "wallet" })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchCreatedTokens(wallet) {
  const { data: tokens, error } = await supabase
    .from("tokens")
    .select("*")
    .eq("creator_wallet", wallet)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!tokens?.length) return [];

  const addresses = tokens.map((t) => t.address);
  const { data: metrics } = await supabase
    .from("token_metrics_latest")
    .select("address, price, price_usd, market_cap, volume_total, holder_count")
    .in("address", addresses);

  const metricsByAddress = new Map((metrics || []).map((m) => [m.address, m]));

  return tokens.map((t) => {
    const m = metricsByAddress.get(t.address);
    return {
      ...t,
      logo: t.logo_path ? resolveLogoUrl(supabase, t.logo_path) : t.logo_url || null,
      price_usd: m?.price_usd != null ? fromBaseUnits(m.price_usd, 8) : null,
      market_cap: m?.market_cap != null ? fromBaseUnits(m.market_cap, 18) : null,
      holder_count: m?.holder_count ?? t.holder_count ?? null,
    };
  });
}

export async function fetchPortfolio(wallet) {
  const { data: holdings, error } = await supabase
    .from("token_holder_balances")
    .select("token_address, balance")
    .eq("wallet_address", wallet)
    .gt("balance", 0);
  if (error) throw error;
  if (!holdings?.length) return [];

  const addresses = holdings.map((h) => h.token_address);

  const [{ data: tokens }, { data: metrics }, { data: changeRows }] = await Promise.all([
    supabase.from("tokens").select("address, name, symbol, logo_path, logo_url").in("address", addresses),
    supabase.from("token_metrics_latest").select("address, price_usd").in("address", addresses),
    supabase.from("token_metrics_with_change").select("token_address, change24h").in("token_address", addresses),
  ]);

  const tokensByAddress = new Map((tokens || []).map((t) => [t.address, t]));
  const metricsByAddress = new Map((metrics || []).map((m) => [m.address, m]));
  const changeByAddress = new Map((changeRows || []).map((c) => [c.token_address, c.change24h]));

  return holdings
    .map((h) => {
      const token = tokensByAddress.get(h.token_address);
      const priceUsdRaw = metricsByAddress.get(h.token_address)?.price_usd ?? null;
      const priceUsd = priceUsdRaw != null ? fromBaseUnits(priceUsdRaw, 8) : null;
      // balance is a fine-unit (18-decimal) numeric column — convert to a whole-token count.
      const balance = h.balance != null ? fromBaseUnits(h.balance, 18) ?? 0 : 0;
      const valueUsd = priceUsd != null ? balance * priceUsd : null;
      return {
        token_address: h.token_address,
        name: token?.name || "Unknown token",
        symbol: token?.symbol || "—",
        logo: token?.logo_path ? resolveLogoUrl(supabase, token.logo_path) : token?.logo_url || null,
        balance,
        price_usd: priceUsd,
        value_usd: valueUsd,
        change_24h: changeByAddress.has(h.token_address) ? changeByAddress.get(h.token_address) : null,
      };
    })
    .sort((a, b) => (b.value_usd ?? 0) - (a.value_usd ?? 0));
}

export async function fetchTransactionsPage(wallet, from) {
  const { data, error } = await supabase
    .from("transactions")
    .select("tx_hash, token_address, user_address, type, token_amount, eth_amount, usd_value, created_at")
    .eq("user_address", wallet)
    .order("created_at", { ascending: false })
    .range(from, from + TX_PAGE_SIZE - 1);
  if (error) throw error;
  const rows = data || [];
  if (!rows.length) return rows;

  // tokens.decimals is always 18 in this schema, so only the symbol is worth
  // joining here — the amount conversion itself uses a fixed 18 at render time.
  const addresses = [...new Set(rows.map((r) => r.token_address))];
  const { data: tokenRows } = await supabase.from("tokens").select("address, symbol").in("address", addresses);
  const symbolByAddress = new Map((tokenRows || []).map((t) => [t.address, t.symbol]));

  return rows.map((r) => ({ ...r, token_symbol: symbolByAddress.get(r.token_address) || null }));
}

/** Count of active (user_wallet -> followed_wallet) rows in each direction. */
export async function fetchFollowCounts(wallet) {
  const [followers, followingRes] = await Promise.all([
    supabase.from("user_follow").select("id", { count: "exact", head: true }).eq("followed_wallet", wallet).eq("is_active", true),
    supabase.from("user_follow").select("id", { count: "exact", head: true }).eq("user_wallet", wallet).eq("is_active", true),
  ]);
  return {
    followers: followers.count ?? 0,
    following: followingRes.count ?? 0,
  };
}

export async function fetchIsFollowing(userWallet, followedWallet) {
  if (!userWallet || !followedWallet) return false;
  const { data } = await supabase
    .from("user_follow")
    .select("is_active")
    .eq("user_wallet", userWallet)
    .eq("followed_wallet", followedWallet)
    .maybeSingle();
  return Boolean(data?.is_active);
}

/** Insert-or-update the follow relationship — handles both the first-ever
 * follow (no row exists yet) and toggling an existing one. */
export async function setFollowState(userWallet, followedWallet, isActive) {
  const { data: existing } = await supabase
    .from("user_follow")
    .select("id")
    .eq("user_wallet", userWallet)
    .eq("followed_wallet", followedWallet)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("user_follow").update({ is_active: isActive }).eq("id", existing.id);
    if (error) throw error;
  } else if (isActive) {
    const { error } = await supabase
      .from("user_follow")
      .insert({ user_wallet: userWallet, followed_wallet: followedWallet, is_active: true });
    if (error) throw error;
  }
}
