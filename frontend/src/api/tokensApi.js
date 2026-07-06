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
    throw new Error(`Logo upload failed: ${uploadError.message}`);
  }

  const { data: publicData, error: urlErr } = supabase.storage
    .from("logos")
    .getPublicUrl(filePath);

  if (urlErr) {
    throw new Error(`Failed to get public URL: ${urlErr.message}`);
  }

  return { path: filePath, url: publicData?.publicUrl ?? null };
}

/**
 * createToken - Fixed version with strict error handling and schema matching
 */
export async function createToken(tokenData = {}, logoFile = null) {
  if (!tokenData?.address || !tokenData?.name || !tokenData?.symbol) {
    throw new Error("Missing required token fields: address, name, symbol");
  }

  const address = String(tokenData.address).toLowerCase();
  const creatorWallet = tokenData.creator_wallet
    ? String(tokenData.creator_wallet).toLowerCase()
    : null;

  // 1. Handle Logo Upload
  let logo_path = null;
  let logo_url = null;
  
  if (logoFile) {
    const uploaded = await uploadLogo(logoFile);
    logo_path = uploaded.path; // Saved as 'logos/12345_name.png'
    logo_url = uploaded.url;
  }

  // 2. Prepare record (Removed total_supply as it caused a database 400 error)
  const record = {
    address,
    name: tokenData.name,
    symbol: tokenData.symbol,
    type: tokenData.type || tokenData.category || "Other",
    description: tokenData.description || "",
    website: tokenData.website || null,
    twitter: tokenData.twitter || null,
    telegram: tokenData.telegram || null,
    logo_path: logo_path, 
    creator_wallet: creatorWallet,
    creator_uid: null,
    chain_id: tokenData.chain_id ?? 1,
    // total_supply removed to prevent 'column not found' error
    
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  // 3. Upsert token
  const { data, error } = await supabase
    .from("tokens")
    .upsert(record, { onConflict: "address" })
    .select()
    .maybeSingle();

  if (error) {
    console.error("Supabase upsert error:", error);
    throw new Error(`Database error: ${error.message}`);
  }

  return { ...(data || {}), logo_url };
}
