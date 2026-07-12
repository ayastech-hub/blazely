/**
 * =================================================================================
 * utils/format.js
 * =================================================================================
 * Every formatter that was previously copy-pasted (with slightly different bugs each
 * time) across TokenHeader.jsx, TopHolders.jsx, RecentTransactions.jsx, and SocialLinks.jsx
 * now lives here once. Also centralizes the block-explorer base URL, which was
 * INCONSISTENT across the old files (some hardcoded basescan.org, one hardcoded
 * sepolia.etherscan.io) — pick ONE via env var and use it everywhere.
 * =================================================================================
 */

// Set this to match whichever chain you're actually deployed on. Every old file guessed
// differently — this is the one place it's decided now.
export const EXPLORER_BASE_URL = import.meta.env.VITE_EXPLORER_BASE_URL || "https://sepolia.etherscan.io";

export function explorerAddressUrl(address) {
  return `${EXPLORER_BASE_URL}/address/${address}`;
}

export function explorerTxUrl(txHash) {
  return `${EXPLORER_BASE_URL}/tx/${txHash}`;
}

export function shortenAddress(addr = "", chars = 4) {
  if (!addr || addr.length < chars * 2 + 3) return addr || "—";
  return `${addr.slice(0, chars + 2)}...${addr.slice(-chars)}`;
}

/** Formats a USD price with the "leading zeros" compact notation for very small prices
 *  (e.g. new bonding-curve tokens priced at $0.0000003). */
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
/** Compact number formatting (1.2K, 3.4M, 1.2B, etc.) shared by market cap / volume displays. */
export function formatCompact(num, isCurrency = false) {
  if (num === null || num === undefined) return isCurrency ? "$0" : "0";
  const n = Number(num);
  if (isNaN(n)) return "—";
  const sign = isCurrency ? "$" : "";
  
  if (Math.abs(n) < 1000) return `${sign}${n.toFixed(2)}`;
  
  const units = ["", "K", "M", "B", "T"];
  // Log10(1,000,000,000) is 9, divided by 3 is 3, which maps to "B" in the units array
  const i = Math.min(units.length - 1, Math.floor(Math.log10(Math.abs(n)) / 3));
  
  // Clean up: use Number.parseFloat to remove unnecessary trailing zeros if desired, 
  // or keep toFixed(2) for consistency.
  return `${sign}${(n / 10 ** (i * 3)).toFixed(2).replace(/\.00$/, "")}${units[i]}`;
}


/** Formats a wei-denominated bigint/string as a human ETH amount without pulling in
 *  ethers just for display (mirrors indexer/telegram-platform's own format.js helper). */
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

/** Resolves a display logo URL, preferring the already-public `logo_url` written by the
 *  token-creation backend, and only falling back to reconstructing a Storage public URL
 *  from `logo_path` for legacy rows. Bucket name MUST match what the backend actually
 *  uploads to (`token-logos` — see backend/token-creation-listener.js), not the old,
 *  incorrect `"logos"` bucket name this used to reference. */
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
