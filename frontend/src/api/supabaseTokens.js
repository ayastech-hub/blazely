import { supabase } from "../lib/supabaseClient";

/** * Cleans the logo path to ensure it doesn't double-prefix 'logos/'. */
export function getCleanLogoPath(path) {
  if (!path) return null;
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

  const logo_path = row.logo_path || null;
  const logo = row.logo || row.logo_url || (row.socials?.logo || row.socials?.image) || null;

  return {
    address: String(row.address || row.contract_address || ""),
    id: row.id || row.address,
    name: row.name || row.symbol || row.address,
    symbol: row.symbol || (row.name ? row.name.slice(0, 6).toUpperCase() : "TKN"),
    logo,
    logo_path,
    category: row.type || row.category || "Other",
    marketcap_usd: row.market_cap ?? row.market_cap ?? row.marketcap_usd ?? 0,
    volume_24h: row.volume_24h ?? row.volume ?? 0,
    price: row.price ?? 0,
    last_updated: row.last_updated || row.updated_at || null,
    graduated: Boolean(row.graduated === true || String(row.graduated) === "true"),
    listed: Boolean(row.listed === true || String(row.listed) === "true"),
    initialMetrics: row.token_metrics_latest || null,
    __raw: row,
  };
}

/** Build base query with filters */
function buildBaseQuery({ filter, search, owner, excludeGraduated, sort } = {}) {
  let query = supabase.from("tokens").select(`*, market_cap, volume_24h, price, token_metrics_latest(*)`, { count: "exact" });

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
  console.log("--- DEBUG: Fetching Tokens ---", params);
  
  try {
    const from = (params.page - 1) * params.perPage;
    const to = from + params.perPage - 1;

    let query = buildBaseQuery(params);

    if (params.listedOnly) {
      console.log("DEBUG: Applying 'listed' filter");
      query = query.eq("listed", true);
    }

    const { data, error, count } = await query.range(from, to);
    
    if (error) {
      console.error("--- DEBUG: Supabase Error ---", error);
      throw error;
    }
    
    console.log("--- DEBUG: Raw Data Received ---", data);
    console.log("--- DEBUG: Total Count ---", count);
    
    return { data: (data || []).map(normalizeToken), count: count || 0, error: null };
  } catch (err) {
    console.error("--- DEBUG: fetchTokensFromSupabase Catch Block Error ---", err);
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
