// src/utils/format.js

// Configuration: Matches whichever chain you're deployed on.
export const EXPLORER_BASE_URL = import.meta.env.VITE_EXPLORER_BASE_URL || "https://sepolia.etherscan.io";

/** "0xAbCd...1234" */
export function shortenAddress(addr = "", chars = 4) {
  if (!addr || addr.length < chars * 2 + 3) return addr || "—";
  return `${addr.slice(0, chars + 2)}...${addr.slice(-chars)}`;
}

/** Compact number formatting (1.2K, 3.4M, 1.2B, etc.) */
export function formatCompact(num, isCurrency = false) {
  if (num === null || num === undefined) return isCurrency ? "$0" : "0";
  const n = Number(num);
  if (isNaN(n)) return "—";
  const sign = isCurrency ? "$" : "";
  
  if (Math.abs(n) < 1000) return `${sign}${n.toFixed(2)}`;
  
  const units = ["", "K", "M", "B", "T"];
  const i = Math.min(units.length - 1, Math.floor(Math.log10(Math.abs(n)) / 3));
  return `${sign}${(n / 10 ** (i * 3)).toFixed(2).replace(/\.00$/, "")}${units[i]}`;
}

/** Formats a USD price with "leading zeros" compact notation for very small prices */
export function formatUsdPrice(price) {
  if (price === null || price === undefined) return "—";
  const num = Number(price);
  if (isNaN(num)) return "—";
  if (num === 0) return "$0.00";

  if (num >= 0.1) {
    return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  }

  const str = num.toFixed(20);
  const match = str.match(/^0\.(0+)/);
  if (match) {
    const zeroCount = match[1].length;
    const sigDigits = str.substring(zeroCount + 2, zeroCount + 6).replace(/0+$/, "");
    return `$0.0(${zeroCount})${sigDigits}`;
  }
  return `$${num.toFixed(6)}`;
}

/** Whole-dollar USD amount */
export function formatUsd(value) {
  const n = Number(value);
  if (value == null || Number.isNaN(n)) return "—";
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Decimals-aware conversion of raw integer amount (BigInt math) */
export function formatUnits(rawValue, decimals = 18, { maxFractionDigits = 6 } = {}) {
  if (rawValue == null || rawValue === "") return "—";
  try {
    const raw = String(rawValue).trim();
    const negative = raw.startsWith("-");
    const digitsOnly = negative ? raw.slice(1) : raw;
    if (!/^\d+$/.test(digitsOnly)) {
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
export function formatWei(weiValue, decimals = 4) {
  if (weiValue === null || weiValue === undefined) return "—";
  try {
    const wei = BigInt(weiValue);
    const negative = wei < 0n;
    const abs = negative ? -wei : wei;
    const base = 10n ** 18n;
    const whole = abs / base;
    const frac = abs % base;
    const fracStr = frac.toString().padStart(18, "0").slice(0, decimals);
    return `${negative ? "-" : ""}${whole.toString()}.${fracStr}`;
  } catch {
    return "—";
  }
}

/** Already-decimal-adjusted token amount -> compact display */
export function formatTokenAmount(value) {
  const n = Number(value);
  if (value == null || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1000) return formatCompact(n);
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

/** Signed percentage: "+3.42%" / "-1.05%" */
export function formatPercent(value) {
  if (value == null) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

/** ISO or Postgres timestamp -> "3m", "2h", "5d" */
export function timeAgo(isoDate, nowMs = Date.now()) {
  if (!isoDate) return "—";
  let standardized = String(isoDate).replace(" ", "T");
  if (!standardized.includes("Z") && !standardized.includes("+")) standardized += "Z";
  const txMs = new Date(standardized).getTime();
  if (isNaN(txMs)) return "—";

  const seconds = Math.floor(Math.max(0, nowMs - txMs) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function explorerAddressUrl(address) {
  return `${EXPLORER_BASE_URL}/address/${address}`;
}

export function explorerTxUrl(txHash) {
  return `${EXPLORER_BASE_URL}/tx/${txHash}`;
}

/** Resolves logo URL (prefers logo_url, falls back to logo_path) */
export function resolveLogoUrl(token, supabaseClient) {
  if (!token) return "/fallback-logo.png";
  if (token.logo_url) return token.logo_url;
  if (token.logo_path && supabaseClient) {
    try {
      const { data } = supabaseClient.storage.from("token-logos").getPublicUrl(token.logo_path);
      return data?.publicUrl || "/fallback-logo.png";
    } catch {
      return "/fallback-logo.png";
    }
  }
  return "/fallback-logo.png";
}
