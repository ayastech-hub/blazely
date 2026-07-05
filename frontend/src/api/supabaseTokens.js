//api/supabaseTokens.js
import { supabase } from "../lib/supabaseClient";

/** Safely get a public URL from storage path */
async function getPublicUrlSafe(path) {
  if (!path) return null;
  try {
    const res = supabase.storage.from("logos").getPublicUrl(path);
    return res?.data?.publicUrl || res?.publicURL || res?.publicUrl || null;
  } catch (e) {
    console.warn("getPublicUrlSafe error:", e);
    return null;
  }
}

/** Normalize raw token row from Supabase */
export function normalizeToken(row) {
  if (!row) return null;

  let logo = null;
  try {
    if (row.logo_path)
      logo =
        supabase.storage.from("logos").getPublicUrl(row.logo_path)?.data
          ?.publicUrl || null;
    else if (row.logo_url) logo = row.logo_url;
    else if (row.logo) logo = row.logo;
    else if (row.socials) logo = row.socials.logo || row.socials.image || null;
  } catch (e) {
    logo = row.logo || row.logo_url || null;
  }

  const address = String(
    row.address || row.address || row.contract_address || ""
  ); // Use the denormalized columns directly from the main row object

  const marketcap_usd =
    row.marketcap ?? row.market_cap ?? row.marketcap_usd ?? 0;
  const volume_24h = row.volume_24h ?? row.volume ?? 0;

  const graduated = Boolean(
    row.graduated === true || String(row.graduated) === "true"
  );
  const listed =
    Boolean(
      row.listed_on_uniswap === true || String(row.listed_on_uniswap) === "true"
    ) || Boolean(row.listed === true || String(row.listed) === "true");

  return {
    address,
    id: row.id || address,
    name: row.name || row.symbol || address,
    symbol:
      row.symbol || (row.name ? row.name.slice(0, 6).toUpperCase() : "TKN"),
    logo,
    logo_path: row.logo_path || null,
    category: row.type || row.category || "Other", // Use the denormalized values as the primary source
    marketcap_usd,
    volume_24h,
    price: row.price ?? 0,
    last_updated: row.last_updated || row.updated_at || null,
    website: row.website || row.socials?.website || null,
    twitter: row.twitter || row.socials?.twitter || null,
    telegram: row.telegram || row.socials?.telegram || null,
    description: row.description || row.socials?.description || null,
    creator_wallet: row.creator_wallet || null,
    created_at: row.created_at || null,
    graduated,
    listed,
    initialMetrics: row.token_metrics_latest || null, // <-- forward latest metrics
    __raw: row,
  };
}

/** Build base query with filters (UPDATED) */
function buildBaseQuery({
  filter,
  search,
  owner,
  excludeGraduated,
  sort,
} = {}) {
  // Ensure the new denormalized columns are explicitly selected alongside the nested metrics
  let query = supabase.from("tokens").select(
    `*, 
         marketcap, 
         volume_24h, 
         price, 
         token_metrics_latest(*)`,
    { count: "exact" }
  );

  if (owner && ["MyTokens", "My Tokens", "Creator"].includes(filter)) {
    query = query.eq("creator_wallet", String(owner).toLowerCase());
  } else if (filter === "MyTokens" || filter === "My Tokens") {
    query = query.eq("creator_wallet", "__no_owner__");
    return query;
  }

  if (
    filter &&
    filter !== "All" &&
    !["MyTokens", "My Tokens", "Creator"].includes(filter)
  ) {
    query = query.eq("type", filter);
  }

  if (excludeGraduated) query = query.eq("graduated", false);

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(
      `name.ilike.${term},symbol.ilike.${term},address.ilike.${term}`
    );
  } // --- Map dropdown sort labels to actual DB columns ---

  let column = "created_at"; // default
  let ascending = false;

  switch ((sort || "").toLowerCase()) {
    case "recently listed":
      column = "created_at";
      ascending = false;
      break;
    case "marketcap": // Now sorting by the denormalized column on the main 'tokens' table
      column = "marketcap";
      ascending = false;
      break;
    case "24h volume": // Now sorting by the denormalized column on the main 'tokens' table
      column = "volume_24h";
      ascending = false;
      break;
    default: // Default sort is also marketcap
      column = "marketcap";
      ascending = false;
  } // *** MODIFICATION: Always order by the top-level column ***
  // Since the column names now exist on the 'tokens' table, we order directly.

  query = query.order(column, { ascending }); // Secondary sort for stable results when the primary sort is equal (e.g., tokens with $0 volume)
  if (column !== "created_at") {
    query = query.order("created_at", { ascending: false });
  }

  return query;
}

/** Fetch tokens with pagination, filters, listedOnly & latest metrics */
export async function fetchTokensFromSupabase({
  page = 1,
  perPage = 12,
  filter = "All",
  search = "",
  sort = "marketcap",
  owner = null,
  excludeGraduated = false,
  listedOnly = false,
} = {}) {
  try {
    const from = (page - 1) * perPage;
    const to = from + perPage - 1; // Early exit for MyTokens without owner

    if ((filter === "MyTokens" || filter === "My Tokens") && !owner)
      return { data: [], count: 0 };

    let query = buildBaseQuery({
      filter,
      search,
      owner,
      excludeGraduated,
      sort,
    });

    if (listedOnly) {
      // try listed_on_uniswap first, fallback to listed
      try {
        query = query.eq("listed_on_uniswap", true);
        const { data, error, count } = await query.range(from, to);
        if (error?.code === "42703") throw error;
        return { data: (data || []).map(normalizeToken), count: count || 0 };
      } catch (err) {
        if (err.code === "42703") {
          query = buildBaseQuery({
            filter,
            search,
            owner,
            excludeGraduated,
            sort,
          }).eq("listed", true);
          const { data, error, count } = await query.range(from, to);
          if (error) return { data: [], count: 0, error };
          return { data: (data || []).map(normalizeToken), count: count || 0 };
        }
        return { data: [], count: 0, error: err };
      }
    }

    const { data, error, count } = await query.range(from, to);
    if (error) return { data: [], count: 0, error };

    return { data: (data || []).map(normalizeToken), count: count || 0 };
  } catch (err) {
    console.error("fetchTokensFromSupabase unexpected error:", err);
    return { data: [], count: 0, error: err };
  }
}

/** Fetch a single token by address (SLIGHTLY UPDATED) */
export async function fetchTokenByAddress(address) {
  try {
    if (!address) return { data: null, error: new Error("missing address") };
    const addr = String(address).toLowerCase();

    const { data, error } = await supabase
      .from("tokens")
      .select(
        `*, 
             marketcap, 
             volume_24h, 
             price, 
             token_metrics_latest(*)`
      ) // Explicitly include denormalized columns
      .ilike("address", addr)
      .limit(1)
      .maybeSingle();

    if (error) return { data: null, error };
    if (!data) return { data: null, error: null };

    const normalized = normalizeToken(data);
    if (normalized.logo_path && !normalized.logo) {
      const publicUrl = await getPublicUrlSafe(normalized.logo_path);
      if (publicUrl) normalized.logo = publicUrl;
    }

    return { data: normalized, error: null };
  } catch (err) {
    console.error("fetchTokenByAddress error:", err);
    return { data: null, error: err };
  }
}
