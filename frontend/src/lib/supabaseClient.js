// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

/**
 * Make sure these environment variables exist in your Vite/.env:
 * VITE_REACT_APP_REACT_APP_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 *
 * Example .env (at project root):
 * VITE_REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
 * VITE_SUPABASE_ANON_KEY=eyJ...yourAnonKey...
 *
 * NOTE: Vite exposes only variables prefixed with VITE_ to the client.
 */

// Read env vars (Vite exposes import.meta.env.VITE_*)
const REACT_APP_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!REACT_APP_SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Helpful console warning for dev — remove or change in production if desired
  // eslint-disable-next-line no-console
  console.warn(
    "Missing Supabase env vars: VITE_REACT_APP_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Check your .env"
  );
}

/**
 * Create the client.
 * Creating a single client here and re-using it avoids duplicate connections.
 */
const supabase = createClient(
  REACT_APP_SUPABASE_URL || "",
  SUPABASE_ANON_KEY || ""
);

/**
 * Helper: normalize getPublicUrl response across SDK versions / shapes.
 * Supabase JS historically returned different shapes (publicURL, publicUrl, data.publicUrl).
 * This function returns a usable string or null.
 *
 * Usage:
 *   const url = getPublicUrlFromStorage('logos', 'path/to/file.png');
 */
export async function getPublicUrlFromStorage(bucket, path) {
  if (!bucket || !path) return null;
  try {
    const res = supabase.storage.from(bucket).getPublicUrl(path);
    // res may be { publicURL } or { publicUrl } or { data: { publicUrl } } depending on SDK/version
    return (
      res?.publicURL ??
      res?.publicUrl ??
      res?.data?.publicUrl ??
      res?.data?.publicURL ??
      null
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("getPublicUrlFromStorage error:", err);
    return null;
  }
}

/**
 * Default & named export for compatibility across import styles:
 * - import { supabase } from '...'
 * - import supabase from '...'
 */
export { supabase as default, supabase };
