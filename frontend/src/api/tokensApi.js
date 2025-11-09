// src/api/tokensApi.js
import { supabase } from "../lib/supabaseClient";

/**
 * sanitizeFilename - keep safe characters only and limit length
 */
function sanitizeFilename(name = "") {
  return String(name)
    .trim()
    .replace(/\s+/g, "_") // spaces -> underscore
    .replace(/[^a-zA-Z0-9._-]/g, "") // remove unsafe chars
    .slice(0, 200);
}

/**
 * Upload a logo file to the 'logos' bucket and return { path, url }.
 * - Uses logos/<sanitized-filename> path
 * - Uses upsert: true to allow replacing same file during testing
 */
export async function uploadLogo(file) {
  if (!file) return null;

  // determine extension safely
  const ext = (file.name || "").split(".").pop() || "png";
  const baseName = sanitizeFilename((file.name || "").replace(/\.[^.]+$/, ""));
  const fileName = `${Date.now()}_${baseName}.${ext}`;
  const filePath = `logos/${fileName}`;

  // perform upload (file must be a Blob/File)
  const { error: uploadError } = await supabase.storage
    .from("logos")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true, // allow overwriting the same path if re-uploading during dev
      contentType: file.type || "application/octet-stream",
    });

  if (uploadError) {
    // pass error up with helpful context
    uploadError.message = `Logo upload failed: ${uploadError.message || ""}`;
    throw uploadError;
  }

  // get public url
  const { data: publicData, error: urlErr } = supabase.storage
    .from("logos")
    .getPublicUrl(filePath);

  if (urlErr) {
    urlErr.message = `Failed to get public URL for logo: ${
      urlErr.message || ""
    }`;
    throw urlErr;
  }

  const publicUrl = publicData?.publicUrl ?? null;
  return { path: filePath, url: publicUrl };
}

/**
 * createToken - uploads logo (if provided) and inserts token metadata into `tokens` table.
 * Important: includes creator_uid for RLS. If tokenData.creator_uid not provided,
 * this function will attempt to fetch the current supabase auth user and set it.
 *
 * tokenData expected shape (at minimum):
 * {
 *   address, name, symbol, description, category,
 *   telegram, twitter, website,
 *   creator_wallet, creator_uid (optional)
 * }
 */
export async function createToken(tokenData = {}, logoFile = null) {
  if (
    !tokenData ||
    !tokenData.address ||
    !tokenData.name ||
    !tokenData.symbol
  ) {
    throw new Error("Missing required token fields: address, name, symbol");
  }

  // Ensure address + creator_wallet lowercasing where present
  const address = String(tokenData.address).toLowerCase();
  const creatorWallet = tokenData.creator_wallet
    ? String(tokenData.creator_wallet).toLowerCase()
    : null;

  // If creator_uid not provided, attempt to get it from supabase auth session
  let creatorUid = tokenData.creator_uid ?? null;
  if (!creatorUid) {
    try {
      const userResp = await supabase.auth.getUser();
      creatorUid = userResp?.data?.user?.id ?? null;
    } catch (e) {
      // if auth.getUser() fails, creatorUid remains null; insert may fail if RLS requires it
      console.warn("Could not obtain supabase auth user for creator_uid:", e);
    }
  }

  // 1) upload logo if provided
  let logo_path = null;
  let logo_url = null;
  if (logoFile) {
    const uploaded = await uploadLogo(logoFile);
    logo_path = uploaded.path;
    logo_url = uploaded.url;
  }

  // Build record to insert
  const record = {
    address,
    name: tokenData.name,
    symbol: tokenData.symbol,
    description: tokenData.description || "",
    category: tokenData.category || "",
    logo_path,
    socials: {
      telegram: tokenData.telegram || null,
      twitter: tokenData.twitter || null,
      website: tokenData.website || null,
    },
    creator_wallet: creatorWallet,
    creator_uid: creatorUid, // important for RLS
    buy_volume: 0,
    sell_volume: 0,
    holders: tokenData.holders ?? [],
    recent_transactions: tokenData.recent_transactions ?? [],
    created_at: tokenData.created_at ?? new Date().toISOString(),
  };

  // 2) Insert row into tokens table
  const { data, error } = await supabase
    .from("tokens")
    .insert(record)
    .select()
    .maybeSingle(); // maybeSingle => returns null when not found rather than throw PGRST116

  if (error) {
    // Improve error messaging for common RLS issue
    if (
      String(error.message || "")
        .toLowerCase()
        .includes("row-level security")
    ) {
      const rlsErr = new Error(
        "Row-level security prevented the insert. Ensure 'creator_uid' equals auth.uid() or adjust RLS policies."
      );
      rlsErr.original = error;
      throw rlsErr;
    }
    // Otherwise re-throw
    throw error;
  }

  // 3) Try to call RPC to append token to creator's list (best-effort)
  try {
    if (creatorWallet) {
      await supabase.rpc("append_token_to_creator", {
        w: creatorWallet,
        a: address,
      });
    }
  } catch (rpcErr) {
    // don't fail the whole flow for a failing rpc; just warn
    console.warn("append_token_to_creator RPC failed:", rpcErr);
  }

  // 4) Return the inserted row and the public url for UI convenience
  return { ...(data || {}), logo_url };
}

/**
 * fetchToken - helper to fetch a token row by address and compute top_holders
 */
export async function fetchToken(address) {
  if (!address) throw new Error("Missing token address");
  const addr = String(address).toLowerCase();

  const { data, error } = await supabase
    .from("tokens")
    .select("*")
    .eq("address", addr)
    .maybeSingle();

  if (error) throw error;

  const top_holders = (data?.holders || [])
    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
    .slice(0, 10);

  return {
    ...(data || {}),
    top_holders,
    recent_transactions: data?.recent_transactions || [],
  };
}
