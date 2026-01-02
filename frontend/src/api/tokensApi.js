import { supabase } from "../lib/supabaseClient";

/**
 * sanitizeFilename - keep safe characters only and limit length
 */
function sanitizeFilename(name = "") {
  return String(name)
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 200);
}

/**
 * Upload a logo file to 'logos' bucket and return { path, url }
 * Anyone can upload now (no login required)
 */
export async function uploadLogo(file) {
  if (!file) return null;

  const ext = (file.name || "").split(".").pop() || "png";
  const baseName = sanitizeFilename((file.name || "").replace(/\.[^.]+$/, ""));
  const fileName = `${Date.now()}_${baseName}.${ext}`;
  const filePath = `logos/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("logos")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || "application/octet-stream",
    });

  if (uploadError) {
    uploadError.message = `Logo upload failed: ${uploadError.message || ""}`;
    throw uploadError;
  }

  const { data: publicData, error: urlErr } = supabase.storage
    .from("logos")
    .getPublicUrl(filePath);

  if (urlErr) {
    urlErr.message = `Failed to get public URL for logo: ${
      urlErr.message || ""
    }`;
    throw urlErr;
  }

  return { path: filePath, url: publicData?.publicUrl ?? null };
}

/**
 * createToken - anyone can create token and upload logo now
 */
export async function createToken(tokenData = {}, logoFile = null) {
  if (!tokenData?.address || !tokenData?.name || !tokenData?.symbol) {
    throw new Error("Missing required token fields: address, name, symbol");
  }

  const address = String(tokenData.address).toLowerCase();
  const creatorWallet = tokenData.creator_wallet
    ? String(tokenData.creator_wallet).toLowerCase()
    : null;

  // Upload logo if provided
  let logo_path = null;
  let logo_url = null;
  if (logoFile) {
    try {
      const uploaded = await uploadLogo(logoFile);
      logo_path = uploaded.path;
      logo_url = uploaded.url;
    } catch (err) {
      console.warn("Logo upload failed but continuing:", err.message);
    }
  }

  const record = {
    address,
    name: tokenData.name,
    symbol: tokenData.symbol,
    type: tokenData.type || tokenData.category || "Other",
    description: tokenData.description || "",
    website: tokenData.website || null,
    twitter: tokenData.twitter || null,
    telegram: tokenData.telegram || null,
    logo_path,
    creator_wallet: creatorWallet,
    creator_uid: null, // anyone can create
    chain_id: tokenData.chain_id ?? 1,
    total_supply: tokenData.total_supply ?? tokenData.supply ?? 0,

    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Upsert token
  const { data, error } = await supabase
    .from("tokens")
    .upsert(record, { onConflict: "address" })
    .select()
    .maybeSingle();

  if (error) {
    console.warn("Token upsert failed but continuing:", error.message);
  }

  return { ...(data || {}), logo_url };
}
