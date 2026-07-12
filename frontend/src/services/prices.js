
import { supabase } from "../lib/supabaseClient";

/** Reads the current cached ETH/USD price. No calculations, no formatting — just the row. */
export async function fetchEthUsdPrice() {
  const { data, error } = await supabase
    .from("prices")
    .select("price_usd, updated_at")
    .eq("symbol", "ETH")
    .maybeSingle();

  if (error) throw error;
  return data; // { price_usd, updated_at } or null if the price-updater hasn't run yet
}

