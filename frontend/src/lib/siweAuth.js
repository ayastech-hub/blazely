// src/lib/siweAuth.js
//
// Sign-In With Ethereum (EIP-4361) against Supabase's native Web3 Auth.
// Docs: https://supabase.com/docs/guides/auth/auth-web3
//
// WHY NOT supabase.auth.signInWithWeb3()?
// Supabase's own helper signs the message itself via `window.ethereum`
// directly (EIP-1193). This app connects wallets through wagmi/ConnectKit,
// which supports injected wallets, WalletConnect, and Coinbase Wallet —
// only the injected case has a `window.ethereum` to sign through. Using
// wagmi's own `signMessageAsync` instead means the exact same flow works
// regardless of which connector is actually active, then this module POSTs
// the resulting {chain, message, signature} straight to Supabase's
// `/auth/v1/token?grant_type=web3` endpoint — the same REST endpoint
// signInWithWeb3() calls under the hood, so verification is still done
// entirely server-side by Supabase's own Auth server. Nothing here
// implements or trusts its own signature-checking logic.
//
// SCALABILITY — adding more chains later:
// Supabase's `chain` parameter is the chain *family* ("ethereum" covers
// every EVM chain — mainnet, Sepolia, Base, Optimism, etc.), not a specific
// network. The specific network is carried inside the signed SIWE message
// itself via the `Chain ID:` field (EIP-4361 requires this). That means
// adding a new EVM chain later needs zero changes to this file or to
// Supabase's config — just add the chain to `config/wagmi.js`'s `chains`
// array, and whichever chain the wallet is actually connected to when the
// user signs in becomes the chainId embedded in the message automatically.
// (A non-EVM chain like Solana would need a different `chain` value and a
// different signing method — out of scope until one is actually added.)

import { supabase } from "./supabaseClient";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Builds an EIP-4361-compliant SIWE message.
 * https://eips.ethereum.org/EIPS/eip-4361
 */
function buildSiweMessage({ address, chainId, nonce, statement }) {
  const domain = window.location.host;
  const uri = window.location.origin;
  const issuedAt = new Date().toISOString();

  return (
    `${domain} wants you to sign in with your Ethereum account:\n` +
    `${address}\n\n` +
    `${statement}\n\n` +
    `URI: ${uri}\n` +
    `Version: 1\n` +
    `Chain ID: ${chainId}\n` +
    `Nonce: ${nonce}\n` +
    `Issued At: ${issuedAt}`
  );
}

/** Cryptographically random nonce — required by EIP-4361 for replay resistance. */
function generateNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Signs a SIWE message with wagmi's signMessageAsync (works with any
 * connector) and exchanges it for a real Supabase session via the web3
 * grant. Throws on any failure — callers should catch and surface an error
 * state rather than silently treating the user as signed in.
 *
 * @param {object} params
 * @param {string} params.address - the connecting wallet's address
 * @param {number} params.chainId - the currently connected chain's id
 * @param {(message: string) => Promise<string>} params.signMessageAsync -
 *   pass wagmi's signMessageAsync bound to the active connector
 * @returns {Promise<{ user: object, session: object }>}
 */
export async function signInWithWallet({ address, chainId, signMessageAsync, captchaToken }) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase URL/anon key not configured — cannot authenticate.");
  }
  if (!address || !chainId) {
    throw new Error("Wallet address and chain ID are required to sign in.");
  }

  const nonce = generateNonce();
  const message = buildSiweMessage({
    address,
    chainId,
    nonce,
    statement: "Sign in to Blazely. This request will not trigger a blockchain transaction or cost any gas fees.",
  });

  const signature = await signMessageAsync({ message });

  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=web3`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      chain: "ethereum", // chain *family* — covers every EVM network, see note above
      message,
      signature,
      // Documented GoTrue REST API format for CAPTCHA verification tokens
      // on the /token endpoint. Only actually checked server-side once
      // "Enable CAPTCHA protection" is on in Supabase Dashboard >
      // Authentication > Attack Protection, with the matching Turnstile
      // secret key configured there. See supabase/README.md.
      gotrue_meta_security: captchaToken ? { captcha_token: captchaToken } : undefined,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error_description || data?.msg || "Wallet sign-in failed.");
  }

  // Hand the issued tokens to the JS client so every subsequent request
  // (and every RLS check on the server) is made as this authenticated user.
  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
  if (sessionError) throw sessionError;

  return sessionData;
}

/** Signs the current Supabase session out. Call this on wallet disconnect. */
export async function signOutWallet() {
  await supabase.auth.signOut();
}

/** Decodes a JWT payload without verifying the signature — safe here because
 *  we're only reading claims Supabase itself already verified server-side
 *  before issuing this token to us; we never trust a JWT we didn't get
 *  directly from supabase-js. */
function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Reads the wallet address Supabase actually authenticated, from the
 * signed, server-verified session's JWT — never from wagmi's reported
 * address. Reads the `wallet_address` custom claim added by our Custom
 * Access Token Hook (supabase/migrations/0001_wallet_auth_claim_hook.sql),
 * not Supabase's internal user_metadata shape, since that hook's claim
 * shape is one we define and control ourselves. Returns null if there's no
 * active session or the claim isn't present (e.g. the hook isn't enabled
 * yet in the Supabase dashboard — see supabase/README.md).
 */
export async function getAuthenticatedWallet() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return null;
  const claims = decodeJwtPayload(token);
  const address = claims?.wallet_address;
  return address ? address.toLowerCase() : null;
}
