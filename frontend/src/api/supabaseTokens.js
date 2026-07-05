import { supabase } from "../lib/supabaseClient";

export function getCleanLogoPath(path) {
  if (!path) return null;
  return path.replace(/^logos\//, '');
}

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

export function normalizeToken(row) {
  if (!row) return null;
  // Access the joined object.
  const metrics = row.token_metrics_latest || {};
  
  return {
    address: String(row.address || ""),
    id: row.id || row.address,
    name: row.name || row.symbol || row.address,
    symbol: row.symbol || (row.name ? row.name.slice(0, 6).toUpperCase() : "TKN"),
    logo: row.logo || row.logo_url || (row.socials?.logo || row.socials?.image) || null,
    logo_path: row.logo_path || null,
    category: row.type || row.category || "Other",
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

function buildBaseQuery({ filter, search, owner, excludeGraduated } = {}) {
  // Select ONLY the join, removing references to market_cap/price in the tokens table
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

  return query;
}

export async function fetchTokensFromSupabase(params = {}) {
  try {
    const from = (params.page - 1) * params.perPage;
    const to = from + params.perPage - 1;

    let query = buildBaseQuery(params);

    if (params.listedOnly) {
      query = query.eq("graduated", true);
    }

    // Sort by created_at as a fallback, then we sort metrics in JS
    query = query.order("created_at", { ascending: false });

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    let normalizedData = (data || []).map(normalizeToken);

    // Sort in JavaScript to avoid "42703: column does not exist" errors
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
