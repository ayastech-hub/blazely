// src/utils/format.js
//
// Shared formatters. Every component should import from here instead of
// redefining its own slightly-different version of the same function.

const EXPLORER_BASE = (import.meta?.env?.VITE_EXPLORER_BASE_URL || "https://basescan.org").replace(/\/$/, "");

/** "0xAbCd...1234" */
export function shortenAddress(address = "", chars = 4) {
  if (!address) return "";
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/** 1234567 -> "1.23M" */
export function formatCompact(value, opts = {}) {
  const n = Number(value);
  if (value == null || Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, {
    notation: "compact",
    maximumFractionDigits: 2,
    ...opts,
  });
}

/**
 * Convert a raw base-unit numeric value (NOT text — for that use formatUnits
 * below) into its human-scale number. Per the indexer's unit reference:
 *  - token_metrics_latest.price, market_cap, volume_total, vault_balance_wei,
 *    token_price_history.price/market_cap, token_holder_balances.balance,
 *    circulating_supply -> decimals = 18
 *  - token_metrics_latest.price_usd -> decimals = 8 (Chainlink fixed-point,
 *    NOT 18 — the one field that's different)
 * Returns a plain JS number (these are `numeric` columns, not `text`, so
 * exact BigInt precision isn't attempted here — see formatUnits for the
 * text-based transaction columns where BigInt precision matters).
 */
export function fromBaseUnits(value, decimals = 18) {
  if (value == null) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return n / Math.pow(10, decimals);
}

/** Real USD price (already converted from the 8-decimal fixed-point column via fromBaseUnits) */
export function formatUsdPrice(value) {
  const n = Number(value);
  if (value == null || Number.isNaN(n)) return "—";
  if (n === 0) return "$0.00";
  if (n < 0.01) {
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`;
  }
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

/** Whole-dollar USD amount, e.g. position value or transactions.usd_value */
export function formatUsd(value) {
  const n = Number(value);
  if (value == null || Number.isNaN(n)) return "—";
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Decimals-aware conversion of a raw integer amount stored as text (the
 * schema stores transactions.token_amount / transactions.eth_amount as
 * `text`, not numeric — almost certainly to avoid precision loss on large
 * wei-scale integers). Converts using BigInt math, never floating point,
 * then formats for display.
 */
export function formatUnits(rawValue, decimals = 18, { maxFractionDigits = 6 } = {}) {
  if (rawValue == null || rawValue === "") return "—";
  try {
    const raw = String(rawValue).trim();
    const negative = raw.startsWith("-");
    const digitsOnly = negative ? raw.slice(1) : raw;
    if (!/^\d+$/.test(digitsOnly)) {
      // Not a plain integer string (already decimal-adjusted) — fall back.
      const n = Number(rawValue);
      return Number.isNaN(n) ? "—" : n.toLocaleString(undefined, { maximumFractionDigits: maxFractionDigits });
    }
    const asBigInt = BigInt(digitsOnly);
    const base = 10n ** BigInt(decimals);
    const whole = asBigInt / base;
    const frac = asBigInt % base;
    const asNumber = Number(whole) + Number(frac) / Number(base);
    const signed = negative ? -asNumber : asNumber;
    return signed.toLocaleString(undefined, { maximumFractionDigits: maxFractionDigits });
  } catch {
    return "—";
  }
}

/** Wei (18-decimal) text/bigint amount -> human ETH string */
export function formatWei(wei, opts = {}) {
  return formatUnits(wei, 18, opts);
}

/** Already-decimal-adjusted token amount (e.g. token_holder_balances.balance, numeric) -> compact display */
export function formatTokenAmount(value) {
  const n = Number(value);
  if (value == null || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1000) return formatCompact(n);
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

/** Signed percentage, e.g. token_metrics_with_change.change24h -> "+3.42%" / "-1.05%" */
export function formatPercent(value) {
  if (value == null) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

/** ISO or Postgres timestamp -> "3m", "2h", "5d" */
export function timeAgo(input) {
  if (!input) return "—";
  const iso = input.includes("T") ? input : `${input.replace(" ", "T")}Z`;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "—";
  const deltaSeconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (deltaSeconds < 60) return `${deltaSeconds}s`;
  if (deltaSeconds < 3600) return `${Math.floor(deltaSeconds / 60)}m`;
  if (deltaSeconds < 86400) return `${Math.floor(deltaSeconds / 3600)}h`;
  return `${Math.floor(deltaSeconds / 86400)}d`;
}

export function explorerAddressUrl(address = "") {
  return `${EXPLORER_BASE}/address/${address}`;
}

export function explorerTxUrl(hash = "") {
  return `${EXPLORER_BASE}/tx/${hash}`;
}

/** Resolve a stored logo_path into a public URL from the token-logos bucket */
export function resolveLogoUrl(supabase, path) {
  if (!path) return null;
  try {
    const { data } = supabase.storage.from("token-logos").getPublicUrl(path);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}
