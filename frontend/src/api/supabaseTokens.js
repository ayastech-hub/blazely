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

  // Extract metrics from the joined table (defaulting to 0)
  const metrics = row.token_metrics_latest || {};
  
  const logo_path = row.logo_path || null;
  const logo = row.logo || row.logo_url || (row.socials?.logo || row.socials?.image) || null;

  return {
    address: String(row.address || ""),
    id: row.id || row.address,
    name: row.name || row.symbol || row.address,
    symbol: row.symbol || (row.name ? row.name.slice(0, 6).toUpperCase() : "TKN"),
    logo,
    logo_path,
    category: row.type || row.category || "Other",
    // Metrics now come from the joined table
    marketcap_usd: metrics.market_cap ?? 0,
    volume_24h: metrics.volume_24h ?? 0,
    price: metrics.price ?? 0,
    last_updated: metrics.last_updated || row.updated_at || null,
    graduated: Boolean(row.graduated === true || String(row.graduated) === "true"),
    listed: Boolean(row.listed === true || String(row.listed) === "true"),
    initialMetrics: metrics,
    __raw: row,
  };
}

/** Build base query with filters */
function buildBaseQuery({ filter, search, owner, excludeGraduated, sort } = {}) {
  // RELATIONAL JOIN: Only select token columns + metrics join
  let query = supabase.from("tokens").select(`
    *, 
    token_metrics_latest (
      market_cap, 
      volume_24h, 
      price, 
      last_updated
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

  // Sorting logic now references the joined metrics table via dot notation
  const sortMap = {
    "recently listed": "created_at",
    "marketcap": "token_metrics_latest(market_cap)",
    "24h volume": "token_metrics_latest(volume_24h)"
  };

  const column = sortMap[(sort || "").toLowerCase()] || "token_metrics_latest(market_cap)";
  
  // Note: Supabase handles the order on joined tables automatically
  query = query.order(column, { ascending: false });

  return query;
}

/** Fetch tokens */
export async function fetchTokensFromSupabase(params = {}) {
  try {
    const from = (params.page - 1) * params.perPage;
    const to = from + params.perPage - 1;

    let query = buildBaseQuery(params);

    // FIX: Using 'graduated' column for the "Graduated Only" toggle
    if (params.listedOnly) {
      query = query.eq("graduated", true);
    }

    const { data, error, count } = await query.range(from, to);
    
    if (error) throw error;
    
    return { data: (data || []).map(normalizeToken), count: count || 0, error: null };
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
