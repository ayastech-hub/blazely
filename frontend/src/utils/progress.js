import { supabase } from "../lib/supabaseClient";

/**
 * Compute graduation progress based on DB market cap
 */
export async function computeProgressPercentFixed(token, fixedTarget = 70000) {
  if (!token?.address) return { graduated: false, percent: 0 };

  // 1️⃣ Fetch latest token row from DB
  const { data: freshToken, error: tokenError } = await supabase
    .from("tokens")
    .select("graduated, graduated_at, listed_on_uniswap, listed_at")
    .eq("address", token.address)
    .maybeSingle();

  if (tokenError) {
    console.error("Failed to fetch token:", tokenError);
    return { graduated: token?.graduated || false, percent: 0 };
  }

  if (freshToken?.graduated) {
    return {
      graduated: true,
      percent: 100,
      graduatedAt: freshToken.graduated_at,
      listed: true,
      listedAt: freshToken.listed_at,
    };
  }

  // 2️⃣ Fetch market cap from token_metrics_latest
  const { data: metrics, error: metricsError } = await supabase
    .from("token_metrics_latest")
    .select("market_cap")
    .eq("address", token.address)
    .maybeSingle();

  if (metricsError) {
    console.error("Failed to fetch token metrics:", metricsError);
    return { graduated: false, percent: 0 };
  }

  const marketcap = metrics?.market_cap || 0;
  if (marketcap <= 0) return { graduated: false, percent: 0 };

  const now = new Date().toISOString();

  // 3️⃣ Check if graduation reached
  if (marketcap >= fixedTarget) {
    // ✅ Update tokens table with graduation info
    const { error: tokenUpdateError } = await supabase
      .from("tokens")
      .update({
        graduated: true,
        graduated_at: now,
        listed_on_uniswap: true,
        listed_at: now,
      })
      .eq("address", token.address)
      .is("graduated", false);

    if (tokenUpdateError)
      console.error("Error updating tokens table:", tokenUpdateError);

    return {
      graduated: true,
      percent: 100,
      graduatedAt: now,
      listed: true,
      listedAt: now,
    };
  }

  // 4️⃣ Still progressing
  const percent = Math.min(100, Math.max(0, (marketcap / fixedTarget) * 100));

  return {
    graduated: false,
    percent: percent < 1 ? 1 : Math.round(percent),
    listed: false,
  };
}
