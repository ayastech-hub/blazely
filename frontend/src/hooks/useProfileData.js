// src/hooks/useProfileData.js
// src/hooks/useProfileData.js
//
// Single consolidated data source for the Profile page, mirroring the
// Token Info Page's useTokenPageData.js pattern: one hook, parallel fetch
// on mount, live via Supabase Realtime where relevant, one shape every
// child component reads from as props. No child component fetches its
// own copy of data this hook already owns.

import { useCallback, useEffect, useRef, useState } from "react";
import * as supabaseClient from "../lib/supabaseClient";
import { resolveLogoUrl } from "../utils/format";

const supabase = supabaseClient.supabase ?? supabaseClient.default ?? supabaseClient;

const TX_PAGE_SIZE = 25;

async function ensureUserRow(wallet) {
  const { data, error } = await supabase
    .from("users")
    .upsert({ wallet }, { onConflict: "wallet" })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchCreatedTokens(wallet) {
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
      price_usd: m?.price_usd ?? null,
      market_cap: m?.market_cap ?? null,
      holder_count: m?.holder_count ?? t.holder_count ?? null,
    };
  });
}

async function fetchPortfolio(wallet) {
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
    // Real 24h change now comes from token_metrics_with_change — no fabricated values.
    supabase.from("token_metrics_with_change").select("token_address, change24h").in("token_address", addresses),
  ]);

  const tokensByAddress = new Map((tokens || []).map((t) => [t.address, t]));
  const metricsByAddress = new Map((metrics || []).map((m) => [m.address, m]));
  const changeByAddress = new Map((changeRows || []).map((c) => [c.token_address, c.change24h]));

  return holdings
    .map((h) => {
      const token = tokensByAddress.get(h.token_address);
      const priceUsd = metricsByAddress.get(h.token_address)?.price_usd ?? null;
      const balance = Number(h.balance) || 0;
      const valueUsd = priceUsd != null ? balance * Number(priceUsd) : null;
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

// NOTE: user_follow's real column is `followed_wallet`, not `following_wallet`.
async function fetchFollowing(wallet) {
  const { data, error } = await supabase
    .from("user_follow")
    .select("followed_wallet, users!user_follow_followed_wallet_fkey(display_name)")
    .eq("user_wallet", wallet)
    .eq("is_active", true);
  if (error) {
    // Fall back to an unjoined select if the FK relationship name differs
    // in the live schema — better to show wallets than to break the tab.
    const fallback = await supabase
      .from("user_follow")
      .select("followed_wallet")
      .eq("user_wallet", wallet)
      .eq("is_active", true);
    return fallback.data || [];
  }
  return data || [];
}

async function fetchWatchlist(wallet) {
  const { data, error } = await supabase
    .from("watchlist")
    .select("token_address, tokens(name, symbol)")
    .eq("user_wallet", wallet);
  if (error) throw error;
  return data || [];
}

async function fetchTransactionsPage(wallet, from) {
  const { data, error } = await supabase
    .from("transactions")
    .select("tx_hash, token_address, user_address, type, token_amount, eth_amount, usd_value, created_at")
    .eq("user_address", wallet)
    .order("created_at", { ascending: false })
    .range(from, from + TX_PAGE_SIZE - 1);
  if (error) throw error;
  const rows = data || [];
  if (!rows.length) return rows;

  // token_amount / eth_amount are stored as `text` (raw integer strings) to
  // avoid precision loss on wei-scale values — resolve each token's decimals
  // so the UI can convert correctly instead of guessing 18 for everything.
  const addresses = [...new Set(rows.map((r) => r.token_address))];
  const { data: tokenRows } = await supabase.from("tokens").select("address, symbol, decimals").in("address", addresses);
  const decimalsByAddress = new Map((tokenRows || []).map((t) => [t.address, t.decimals ?? 18]));
  const symbolByAddress = new Map((tokenRows || []).map((t) => [t.address, t.symbol]));

  return rows.map((r) => ({
    ...r,
    token_decimals: decimalsByAddress.get(r.token_address) ?? 18,
    token_symbol: symbolByAddress.get(r.token_address) || null,
  }));
}

export function useProfileData(address) {
  const wallet = address ? address.toLowerCase() : null;

  const [user, setUser] = useState(null);
  const [createdTokens, setCreatedTokens] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [following, setFollowing] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMoreTransactions, setLoadingMoreTransactions] = useState(false);
  const [error, setError] = useState(null);

  const txPageRef = useRef(0);

  const loadAll = useCallback(async () => {
    if (!wallet) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    txPageRef.current = 0;
    try {
      const [userRow, created, holdings, followData, watchData, txPage] = await Promise.all([
        ensureUserRow(wallet),
        fetchCreatedTokens(wallet),
        fetchPortfolio(wallet),
        fetchFollowing(wallet),
        fetchWatchlist(wallet),
        fetchTransactionsPage(wallet, 0),
      ]);
      setUser(userRow);
      setCreatedTokens(created);
      setPortfolio(holdings);
      setFollowing(followData);
      setWatchlist(watchData);
      setTransactions(txPage);
      setHasMoreTransactions(txPage.length === TX_PAGE_SIZE);
      txPageRef.current = 1;
    } catch (err) {
      console.error("useProfileData: failed to load profile data", err);
      setError(err.message || "Failed to load profile data.");
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Live portfolio updates: refetch holdings when this wallet's balances change.
  useEffect(() => {
    if (!wallet) return;
    const channel = supabase
      .channel(`profile-holdings-${wallet}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "token_holder_balances", filter: `wallet_address=eq.${wallet}` },
        () => {
          fetchPortfolio(wallet).then(setPortfolio).catch((err) => console.error("Portfolio realtime refresh failed", err));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [wallet]);

  // Live transaction feed: prepend new transactions for this wallet.
  useEffect(() => {
    if (!wallet) return;
    const channel = supabase
      .channel(`profile-transactions-${wallet}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `user_address=eq.${wallet}` },
        async (payload) => {
          const row = payload.new;
          const { data: tokenRow } = await supabase.from("tokens").select("decimals, symbol").eq("address", row.token_address).maybeSingle();
          setTransactions((prev) => {
            if (prev.some((r) => r.tx_hash === row.tx_hash)) return prev;
            return [
              { ...row, token_decimals: tokenRow?.decimals ?? 18, token_symbol: tokenRow?.symbol ?? null },
              ...prev,
            ];
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [wallet]);

  const loadMoreTransactions = useCallback(async () => {
    if (!wallet || loadingMoreTransactions || !hasMoreTransactions) return;
    setLoadingMoreTransactions(true);
    try {
      const from = txPageRef.current * TX_PAGE_SIZE;
      const page = await fetchTransactionsPage(wallet, from);
      setTransactions((prev) => {
        const map = new Map(prev.map((r) => [r.tx_hash, r]));
        page.forEach((r) => map.set(r.tx_hash, r));
        return Array.from(map.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      });
      setHasMoreTransactions(page.length === TX_PAGE_SIZE);
      txPageRef.current += 1;
    } catch (err) {
      console.error("useProfileData: failed to load more transactions", err);
    } finally {
      setLoadingMoreTransactions(false);
    }
  }, [wallet, loadingMoreTransactions, hasMoreTransactions]);

  const updateUser = useCallback(
    async (fields) => {
      if (!wallet) return null;
      // users.updated_at is `text` in this schema, not timestamptz — an ISO
      // string still stores correctly, so no cast is needed here.
      const { data, error: updateError } = await supabase
        .from("users")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("wallet", wallet)
        .select()
        .maybeSingle();
      if (updateError) throw updateError;
      setUser(data);
      return data;
    },
    [wallet]
  );

  const updateToken = useCallback(async (tokenAddress, fields, logoFile) => {
    const updates = { ...fields };
    if (logoFile) {
      const ext = logoFile.name.split(".").pop() || "png";
      const path = `${tokenAddress}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("token-logos")
        .upload(path, logoFile, { cacheControl: "3600", upsert: true });
      if (uploadError) throw uploadError;
      updates.logo_path = path;
    }
    const payload = { ...updates, updated_at: new Date().toISOString() };
    const { error: updateError } = await supabase.from("tokens").update(payload).eq("address", tokenAddress);
    if (updateError) throw updateError;

    setCreatedTokens((prev) =>
      prev.map((t) =>
        t.address === tokenAddress
          ? { ...t, ...payload, logo: payload.logo_path ? resolveLogoUrl(supabase, payload.logo_path) : t.logo }
          : t
      )
    );
  }, []);

  const unfollowUser = useCallback(
    async (targetWallet) => {
      if (!wallet) return;
      const target = targetWallet.toLowerCase();
      const { error: updateError } = await supabase
        .from("user_follow")
        .update({ is_active: false })
        .eq("user_wallet", wallet)
        .eq("followed_wallet", target);
      if (updateError) throw updateError;
      setFollowing((prev) => prev.filter((item) => item.followed_wallet.toLowerCase() !== target));
    },
    [wallet]
  );

  const removeWatchlistItem = useCallback(
    async (tokenAddress) => {
      if (!wallet) return;
      const target = tokenAddress.toLowerCase();
      const { error: deleteError } = await supabase
        .from("watchlist")
        .delete()
        .eq("user_wallet", wallet)
        .eq("token_address", target);
      if (deleteError) throw deleteError;
      setWatchlist((prev) => prev.filter((item) => item.token_address.toLowerCase() !== target));
    },
    [wallet]
  );

  return {
    user,
    createdTokens,
    portfolio,
    following,
    watchlist,
    transactions,
    hasMoreTransactions,
    loadingMoreTransactions,
    loading,
    error,
    refresh: loadAll,
    loadMoreTransactions,
    updateUser,
    updateToken,
    unfollowUser,
    removeWatchlistItem,
  };
}

export default useProfileData;
