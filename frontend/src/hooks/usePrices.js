import { useQuery } from "@tanstack/react-query";
import { fetchEthUsdPrice } from "../services/prices";

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes — see Step 7

export function usePrices() {
  const query = useQuery({
    queryKey: ["prices", "ETH"],
    queryFn: fetchEthUsdPrice,
    refetchInterval: 30_000, // 30s — matches the price-updater's own update cadence
    staleTime: 15_000,
  });

  const isStale = query.data?.updated_at
    ? Date.now() - new Date(query.data.updated_at).getTime() > STALE_THRESHOLD_MS
    : false;

  return {
    ethUsd: query.data?.price_usd ?? null,
    updatedAt: query.data?.updated_at ?? null,
    isLoading: query.isLoading,
    isStale,
  };
}
