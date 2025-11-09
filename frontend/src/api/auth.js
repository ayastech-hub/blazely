// src/api/auth.js
import { supabase } from "../lib/supabaseClient";

// create a nonce and save it to users.nonce
export async function requestNonce(wallet) {
  const nonce = crypto.randomUUID().slice(0, 16);
  const message = `Sign this message to authenticate to Launchpad. Nonce: ${nonce}`;
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("users")
    .upsert(
      { wallet: wallet.toLowerCase(), nonce, nonce_created_at: nowIso },
      { onConflict: ["wallet"], returning: "representation" }
    )
    .select()
    .single();

  if (error) throw error;
  return { wallet: wallet.toLowerCase(), message, nonce };
}

// Verify signature locally (recover) and clear nonce on success
import { ethers } from "ethers";
export async function signAndLogin(signer, wallet, message) {
  const signature = await signer.signMessage(message);
  const recovered = ethers.utils.verifyMessage(message, signature);
  if (recovered.toLowerCase() !== wallet.toLowerCase()) {
    throw new Error("Signature mismatch");
  }

  // Clear nonce
  const { error } = await supabase
    .from("users")
    .update({ nonce: null, nonce_created_at: null })
    .eq("wallet", wallet.toLowerCase());
  if (error) throw error;

  // Save basic session info in localStorage (simple)
  localStorage.setItem(
    "lp_auth",
    JSON.stringify({ wallet: wallet.toLowerCase(), signature })
  );
  return { wallet: wallet.toLowerCase() };
}

export function getSession() {
  try {
    const raw = localStorage.getItem("lp_auth");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
