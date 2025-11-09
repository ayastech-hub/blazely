// src/api/supabaseTokens.js
import { supabase } from "../lib/supabaseClient";

/**
 * Normalize raw token record from Supabase into consistent structure
 * expected by the frontend TokenCard and other UI components.
 */
export function normalizeToken(row) {
  if (!row) return null;

  let logo = null;
  try {
    if (row.logo_path) {
      const { publicURL } = supabase.storage
        .from("logos")
        .getPublicUrl(row.logo_path);
      logo = publicURL || null;
    } else if (row.logo_url) {
      logo = row.logo_url;
    } else if (row.logo) {
      logo = row.logo;
    } else if (row.socials && (row.socials.logo || row.socials.image)) {
      logo = row.socials.logo || row.socials.image;
    } else {
      logo = null;
    }
  } catch (e) {
    logo = row.logo || row.logo_url || null;
  }

  const token_address = (
    row.address ||
    row.token_address ||
    row.contract_address ||
    ""
  ).toString();

  const marketcap_usd =
    row.market_cap != null
      ? Number(row.market_cap)
      : row.marketcap_usd != null
      ? Number(row.marketcap_usd)
      : row.marketcap != null
      ? Number(row.marketcap)
      : 0;

  const volume_24h =
    row.volume_24h != null
      ? Number(row.volume_24h)
      : row.buy_volume != null
      ? Number(row.buy_volume)
      : row.volume != null
      ? Number(row.volume)
      : 0;

  const category =
    row.category || row.type || (row.token_type ? row.token_type : "Other");

  return {
    token_address,
    address: token_address,
    id: row.id || token_address,
    name: row.name || row.symbol || token_address,
    symbol:
      row.symbol || (row.name ? row.name.slice(0, 6).toUpperCase() : "TKN"),
    logo,
    logo_path: row.logo_path || null,
    category,
    marketcap_usd,
    volume_24h,
    website: (row.socials && row.socials.website) || row.website || null,
    twitter: (row.socials && row.socials.twitter) || row.twitter || null,
    telegram: (row.socials && row.socials.telegram) || row.telegram || null,
    description:
      row.description || (row.socials && row.socials.description) || null,
    created_at: row.created_at || null,
    __raw: row,
  };
}

/**
 * Fetch tokens from Supabase safely with optional pagination, search, filter and sort.
 */
export async function fetchTokensFromSupabase({
  page = 1,
  perPage = 12,
  filter = "All",
  search = "",
  sort = "Marketcap",
} = {}) {
  try {
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase.from("tokens").select("*", { count: "exact" });

    if (filter && filter !== "All") {
      query = query.eq("category", filter);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(
        `name.ilike.${term},symbol.ilike.${term},address.ilike.${term}`
      );
    }

    // Determine safe order column
    const validColumns = ["created_at", "buy_volume", "market_cap"];
    let orderColumn;
    switch ((sort || "").toLowerCase()) {
      case "newest":
        orderColumn = "created_at";
        query = query.order(orderColumn, { ascending: false });
        break;
      case "oldest":
        orderColumn = "created_at";
        query = query.order(orderColumn, { ascending: true });
        break;
      case "volume":
      case "volume24h":
      case "trending":
        orderColumn = validColumns.includes("buy_volume")
          ? "buy_volume"
          : "created_at";
        query = query
          .order(orderColumn, { ascending: false })
          .order("created_at", { ascending: false });
        break;
      case "marketcap":
      default:
        orderColumn = validColumns.includes("market_cap")
          ? "market_cap"
          : "created_at";
        query = query
          .order(orderColumn, { ascending: false })
          .order("created_at", { ascending: false });
        break;
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error("Supabase fetch tokens error:", error);
      return { data: [], count: 0, error };
    }

    const mapped = (data || []).map((r) => normalizeToken(r));

    return { data: mapped, count: count || 0 };
  } catch (err) {
    console.error("Unexpected fetchTokensFromSupabase error:", err);
    return { data: [], count: 0, error: err };
  }
}

/**
 * Fetch a single token by address (normalized)
 */
export async function fetchTokenByAddress(address) {
  try {
    if (!address) return { data: null, error: new Error("missing address") };
    const { data, error } = await supabase
      .from("tokens")
      .select("*")
      .ilike("address", address)
      .limit(1)
      .single();

    if (error) return { data: null, error };
    return { data: normalizeToken(data), error: null };
  } catch (err) {
    console.error("fetchTokenByAddress error:", err);
    return { data: null, error: err };
  }
}
