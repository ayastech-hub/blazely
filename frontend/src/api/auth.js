// src/api/auth.js
import { supabase } from "../lib/supabaseClient";

/**
 * Authenticate user with Ethereum wallet
 * Uses Supabase official Web3 auth (EIP-4361)
 */
export async function signInWithWallet() {
  const { data, error } = await supabase.auth.signInWithWeb3({
    chain: "ethereum",
    statement: "Sign in to Launchpad",
  });

  if (error) {
    console.error("Web3 sign-in failed:", error);
    throw error;
  }

  return data.session;
}

/**
 * Get active Supabase session
 */
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Sign out user
 */
export async function signOut() {
  await supabase.auth.signOut();
}
