/**
 * =================================================================================
 * utils/chartBucketing.js
 * =================================================================================
 * `token_price_history` stores one row per trade (price, market_cap, created_at) — it is
 * NOT pre-bucketed into OHLC candles. This buckets raw rows into candles client-side for a
 * given timeframe. This is a reasonable approach at moderate history volume; if a token
 * accumulates a very large number of trades, move this bucketing into a Postgres materialized
 * view (grouped by time_bucket) instead of doing it in the browser on every page load — noted
 * here rather than silently left as a scaling cliff.
 * =================================================================================
 */

const TIMEFRAME_SECONDS = {
  "5m": 5 * 60,
  "1H": 60 * 60,
  "1D": 24 * 60 * 60,
};

/**
 * @param {Array<{price: string|number, market_cap: string|number, created_at: string}>} rows
 *        Must already be sorted ascending by created_at.
 * @param {"5m"|"1H"|"1D"} timeframe
 * @param {"PRICE"|"MC"} metric
 * @returns {Array<{time: number, open: number, high: number, low: number, close: number}>}
 */
export function bucketPriceHistory(rows, timeframe, metric) {
  if (!rows || rows.length === 0) return [];

  const bucketSeconds = TIMEFRAME_SECONDS[timeframe] || TIMEFRAME_SECONDS["1H"];
  const field = metric === "MC" ? "market_cap" : "price";

  const buckets = new Map(); // bucketStartUnixSeconds -> { open, high, low, close }

  for (const row of rows) {
    const value = Number(row[field]);
    if (isNaN(value)) continue;

    const rowUnix = Math.floor(new Date(row.created_at).getTime() / 1000);
    const bucketStart = rowUnix - (rowUnix % bucketSeconds);

    const existing = buckets.get(bucketStart);
    if (!existing) {
      buckets.set(bucketStart, { time: bucketStart, open: value, high: value, low: value, close: value });
    } else {
      existing.high = Math.max(existing.high, value);
      existing.low = Math.min(existing.low, value);
      existing.close = value; // rows are sorted ascending, so the last one wins as close
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

/**
 * Appends a single new trade's price point to an existing candle array in place — used by
 * the chart's realtime subscription so a new trade doesn't require re-fetching/re-bucketing
 * the entire history, just updating (or appending) the most recent candle.
 */
export function appendPricePoint(candles, row, timeframe, metric) {
  const bucketSeconds = TIMEFRAME_SECONDS[timeframe] || TIMEFRAME_SECONDS["1H"];
  const field = metric === "MC" ? "market_cap" : "price";
  const value = Number(row[field]);
  if (isNaN(value)) return candles;

  const rowUnix = Math.floor(new Date(row.created_at).getTime() / 1000);
  const bucketStart = rowUnix - (rowUnix % bucketSeconds);

  const last = candles[candles.length - 1];
  if (last && last.time === bucketStart) {
    return [
      ...candles.slice(0, -1),
      { ...last, high: Math.max(last.high, value), low: Math.min(last.low, value), close: value },
    ];
  }
  return [...candles, { time: bucketStart, open: value, high: value, low: value, close: value }];
}
