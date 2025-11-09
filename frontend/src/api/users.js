// src/api/users.js
import { supabase } from "../lib/supabaseClient";

/**
 * Get user row by wallet address. Returns { data, error }.
 * Uses maybeSingle() so it returns data=null when row not found instead of throwing PGRST116.
 */
export async function getUserByWallet(wallet) {
  if (!wallet) return { data: null, error: new Error("missing wallet") };
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, wallet, display_name, tokens_bought, created_at, updated_at")
      .eq("wallet", wallet.toLowerCase())
      .maybeSingle();
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Create a fresh user row for a wallet (if not exists).
 * Returns the created row (or existing row if using upsert).
 */
export async function createUserIfNotExists(wallet, extra = {}) {
  if (!wallet) return { data: null, error: new Error("missing wallet") };
  try {
    // We prefer upsert on conflict (using wallet as unique index) to be safe
    const payload = {
      wallet: wallet.toLowerCase(),
      display_name: extra.display_name || null,
      created_at: new Date().toISOString(),
      ...extra,
    };

    const { data, error } = await supabase
      .from("users")
      .upsert(payload, { onConflict: "wallet" })
      .select()
      .maybeSingle();

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Update user fields by wallet
 */
export async function updateUserByWallet(wallet, updates = {}) {
  if (!wallet) return { data: null, error: new Error("missing wallet") };
  try {
    const { data, error } = await supabase
      .from("users")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("wallet", wallet.toLowerCase())
      .select()
      .maybeSingle();
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}
