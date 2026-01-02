// utils/api.js
import { supabase } from "./supabaseClient";

export async function fetchTokenByAddress(address) {
  const { data, error } = await supabase
    .from("tokens")
    .select("*")
    .eq("address", address)
    .single();

  if (error) {
    console.error("DB fetch error:", error);
    return null;
  }

  return data;
}
