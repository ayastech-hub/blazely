import { supabase } from "../lib/supabaseClient";

/** * Cleans the logo path to ensure it doesn't double-prefix 'logos/'.
 * Use this in your components before passing the path to getPublicUrl.
 */
export function getCleanLogoPath(path) {
  if (!path) return null;
  // If path is stored as 'logos/filename.png', ensure it's handled correctly
  // This removes the prefix if it's already there to prevent double-nesting
  return path.replace(/^logos\//, '');
}

/** Safely get a public URL from storage path */
export async function getPublicUrlSafe(path) {
  if (!path) return null;
  try {
    const cleanPath = getCleanLogoPath(path);
    const { data } = supabase.storage.from("logos").getPublicUrl(cleanPath);
    return data?.publicUrl || null;
  } catch (e) {
    console.warn("getPublicUrlSafe error:", e);
    return null;
  }
}

/** Normalize raw token row from Supabase */
export function normalizeToken(row) {
  if (!row) return null;

  // We keep the path raw. Do not resolve the URL here to keep this function fast and predictable.
  const logo_path = row.logo_path || null;
  
  // Keep existing fallbacks for raw URLs
  const logo = row.logo || row.logo_url || (row.socials?.logo || row.socials?.image) || null;

  return {
    address: String(row.address || row.contract_address || ""),
    id: row.id || row.address,
    name: row.name || row.symbol || row.address,
    symbol: row.symbol || (row.name ? row.name.slice(0, 6).toUpperCase() : "TKN"),
    logo,            // Fallback external URL
    logo_path,       // The internal storage path
    category: row.type || row.category || "Other",
    marketcap_usd: row.marketcap ?? row.market_cap ?? row.marketcap_usd ?? 0,
    volume_24h: row.volume_24h ?? row.volume ?? 0,
    price: row.price ?? 0,
    last_updated: row.last_updated || row.updated_at || null,
    graduated: Boolean(row.graduated === true || String(row.graduated) === "true"),
    listed: Boolean(
      row.listed_on_uniswap === true || 
      String(row.listed_on_uniswap) === "true" || 
      row.listed === true || 
      String(row.listed) === "true"
    ),
    initialMetrics: row.token_metrics_latest || null,
    __raw: row,
  };
}

/** Build base query with filters */
function buildBaseQuery({ filter, search, owner, excludeGraduated, sort } = {}) {
  let query = supabase.from("tokens").select(`*, marketcap, volume_24h, price, token_metrics_latest(*)`, { count: "exact" });

  if (owner && ["MyTokens", "My Tokens", "Creator"].includes(filter)) {
    query = query.eq("creator_wallet", String(owner).toLowerCase());
  } else if (filter === "MyTokens" || filter === "My Tokens") {
    query = query.eq("creator_wallet", "__no_owner__");
    return query;
  }

  if (filter && filter !== "All" && !["MyTokens", "My Tokens", "Creator"].includes(filter)) {
    query = query.eq("type", filter);
  }

  if (excludeGraduated) query = query.eq("graduated", false);

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`name.ilike.${term},symbol.ilike.${term},address.ilike.${term}`);
  }

  let column = "marketcap";
  let ascending = false;

  const sortMap = {
    "recently listed": "created_at",
    "marketcap": "marketcap",
    "24h volume": "volume_24h"
  };

  column = sortMap[(sort || "").toLowerCase()] || "marketcap";
  query = query.order(column, { ascending });
  
  if (column !== "created_at") {
    query = query.order("created_at", { ascending: false });
  }

  return query;
}

/** Fetch tokens */
export async function fetchTokensFromSupabase(params = {}) {
  try {
    const from = (params.page - 1) * params.perPage;
    const to = from + params.perPage - 1;

    let query = buildBaseQuery(params);

    if (params.listedOnly) {
      try {
        query = query.eq("listed_on_uniswap", true);
        const { data, error, count } = await query.range(from, to);
        if (error?.code === "42703") throw error;
        return { data: (data || []).map(normalizeToken), count: count || 0 };
      } catch {
        query = buildBaseQuery(params).eq("listed", true);
        const { data, error, count } = await query.range(from, to);
        return { data: (data || []).map(normalizeToken), count: count || 0, error };
      }
    }

    const { data, error, count } = await query.range(from, to);
    return { data: (data || []).map(normalizeToken), count: count || 0, error };
  } catch (err) {
    console.error("fetchTokensFromSupabase error:", err);
    return { data: [], count: 0, error: err };
  }
}

/** Fetch a single token */
export async function fetchTokenByAddress(address) {
  try {
    const { data, error } = await supabase
      .from("tokens")
      .select(`*, marketcap, volume_24h, price, token_metrics_latest(*)`)
      .ilike("address", String(address).toLowerCase())
      .limit(1)
      .maybeSingle();

    if (error || !data) return { data: null, error };
    return { data: normalizeToken(data), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}
