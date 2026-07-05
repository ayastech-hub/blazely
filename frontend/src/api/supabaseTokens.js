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

  const rawMetrics = Array.isArray(row.token_metrics_latest) 
    ? row.token_metrics_latest[0] 
    : row.token_metrics_latest;
    
  const metrics = rawMetrics || {};
  
  const logo_path = row.logo_path || null;
  const logo = row.logo || row.logo_url || (row.socials?.logo || row.socials?.image) || null;

  // Force values to numbers
  const marketcap = Number(metrics.market_cap ?? 0);
  const volume = Number(metrics.volume_24h ?? 0);
  const price = Number(metrics.price ?? 0);
  const pool_progress = Number(metrics.pool_progress ?? 0); // New field

  return {
    address: String(row.address || ""),
    id: row.id || row.address,
    name: row.name || row.symbol || row.address,
    symbol: row.symbol || (row.name ? row.name.slice(0, 6).toUpperCase() : "TKN"),
    logo,
    logo_path,
    // Add social links explicitly from row
    website: row.website || null,
    twitter: row.twitter || null,
    telegram: row.telegram || null,
    category: row.type || row.category || "Other",
    marketcap_usd: isNaN(marketcap) ? 0 : marketcap,
    volume_24h: isNaN(volume) ? 0 : volume,
    pool_progress: isNaN(pool_progress) ? 0 : pool_progress, // Exported
    price: isNaN(price) ? 0 : price,
    last_updated: metrics.last_updated || row.updated_at || null,
    graduated: Boolean(row.graduated === true || String(row.graduated) === "true"),
    listed: Boolean(row.listed === true || String(row.listed) === "true"),
    initialMetrics: metrics,
    __raw: row,
  };
}

/** Build base query with filters */
function buildBaseQuery({ filter, search, owner, excludeGraduated } = {}) {
  // Added pool_progress to the select statement
  let query = supabase.from("tokens").select(`
    *, 
    token_metrics_latest (
      market_cap, 
      volume_24h, 
      price, 
      last_updated,
      pool_progress
    )
  `, { count: "exact" });
  
 

  if (owner && ["MyTokens", "My Tokens", "Creator"].includes(filter)) {
    query = query.eq("creator_wallet", String(owner).toLowerCase());
  } else if (filter === "MyTokens" || filter === "My Tokens") {
    query = query.eq("creator_wallet", "__no_owner__");
  }

  if (filter && filter !== "All" && !["MyTokens", "My Tokens", "Creator"].includes(filter)) {
    query = query.eq("type", filter);
  }

  if (excludeGraduated) query = query.eq("graduated", false);

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`name.ilike.${term},symbol.ilike.${term},address.ilike.${term}`);
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
      query = query.eq("graduated", true);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    let normalizedData = (data || []).map(normalizeToken);

    const sort = (params.sort || "").toLowerCase();
    if (sort === "marketcap") {
      normalizedData.sort((a, b) => b.marketcap_usd - a.marketcap_usd);
    } else if (sort === "24h volume") {
      normalizedData.sort((a, b) => b.volume_24h - a.volume_24h);
    }

    return { data: normalizedData, count: count || 0, error: null };
  } catch (err) {
    console.error("fetchTokensFromSupabase Error:", err);
    return { data: [], count: 0, error: err };
  }
}

/** Fetch a single token */
export async function fetchTokenByAddress(address) {
  try {
    const { data, error } = await supabase
      .from("tokens")
      .select(`*, token_metrics_latest(*)`)
      .ilike("address", String(address).toLowerCase())
      .limit(1)
      .maybeSingle();

    if (error || !data) return { data: null, error };
    return { data: normalizeToken(data), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}
