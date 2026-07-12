/** Raw wei (bigint/string) → USD, given the current ETH/USD rate. */
export function weiToUsd(weiValue, ethUsd) {
  if (weiValue == null || ethUsd == null) return null;
  const eth = Number(weiValue) / 1e18;
  return eth * ethUsd;
}

/** Already-in-ETH number → USD. */
export function ethToUsd(ethValue, ethUsd) {
  if (ethValue == null || ethUsd == null) return null;
  return Number(ethValue) * ethUsd;
}

/**
 * A token's own price, when you already have `price_usd` from `token_metrics_latest`
 * (8-decimal, Chainlink-sourced) — prefer this over `weiToUsd(price, ethUsd)` for a specific
 * token's price, since it's already computed on-chain and doesn't depend on this table's
 * freshness at all.
 */
export function tokenPriceUsdFromMetrics(metricsPriceUsd) {
  if (metricsPriceUsd == null) return null;
  return Number(metricsPriceUsd) / 1e8;
}
