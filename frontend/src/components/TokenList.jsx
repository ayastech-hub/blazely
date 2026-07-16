import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import TokenCard, {
  cardVariants,
  shakeKeyframes,
  useResolvedLogo,
  compactNumberShort,
  GlassSurface,
  TokenLogo,
  SocialLinks,
  CurveOrStatus,
  ChangeValue,
} from "./TokenCard";

/* Shared with Navbar.jsx / TokenCard.jsx / FilterBar.jsx — keep in sync */
const ACCENT = "#96d6cd";
const NESTED_FILL = "bg-black/25 border border-white/[0.08]";

/* --------------------------------------------------------------------
 * List (table) view
 *
 * The token identity column (logo + name + symbol) is `sticky left-0`
 * so it stays pinned while the rest of the row scrolls horizontally —
 * on a phone you swipe right to see Price / 5M / 1H / 6H / 24H / Mcap /
 * Volume / Curve-Status / Links without ever losing track of *which*
 * token you're looking at. Every column always renders (no breakpoint
 * hiding) — narrow screens get horizontal scroll instead of missing data.
 * ------------------------------------------------------------------ */

const STICKY_COL_WIDTH = "w-[190px]";

// Column widths defined once so the header and every row can never drift
// out of alignment with each other.
const REST_COLUMNS = [
  { key: "price", label: "Price", width: "w-24" },
  { key: "5m", label: "5M", width: "w-14" },
  { key: "1h", label: "1H", width: "w-14" },
  { key: "6h", label: "6H", width: "w-14" },
  { key: "24h", label: "24H", width: "w-14" },
  { key: "mcap", label: "Mcap", width: "w-24" },
  { key: "vol", label: "Volume", width: "w-24" },
  { key: "status", label: "Curve / Status", width: "w-40" },
  { key: "links", label: "Links", width: "w-28" },
];

function TableHeader() {
  return (
    <div className="flex items-stretch border-b border-white/[0.08] min-w-max">
      <div
        className={`sticky left-0 z-20 ${STICKY_COL_WIDTH} shrink-0 flex items-center px-4 py-2.5 bg-[#0b0f1c]/95 backdrop-blur-md border-r border-white/[0.08] text-[10px] text-slate-500 font-semibold`}
      >
        Token
      </div>
      <div className="flex items-center gap-3 px-4 py-2.5 text-[10px] text-slate-500 font-semibold">
        {REST_COLUMNS.map((col) => (
          <div key={col.key} className={`${col.width} shrink-0 text-right`}>
            {col.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function TokenRow({ token, index, isNew }) {
  const logoSrc = useResolvedLogo(token);
  const displayMarketcap = token.market_cap_eth ?? token.marketcap_eth ?? 0;
  const displayVolume = token.volume_eth ?? 0;
  const displayPrice = token.price_usd ?? null;

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate={isNew ? { ...shakeKeyframes, opacity: 1, y: 0, filter: "blur(0px)" } : "visible"}
      custom={index}
      className={`border-b border-white/[0.05] last:border-b-0 transition-colors duration-300 min-w-max ${
        isNew ? "bg-[#96d6cd]/[0.05]" : "hover:bg-white/[0.035]"
      }`}
    >
      <Link to={`/token/${token.address}`} className="flex items-stretch group">
        {/* Sticky/frozen identity column — stays put while the rest scrolls */}
        <div
          className={`sticky left-0 z-10 ${STICKY_COL_WIDTH} shrink-0 flex items-center gap-3 px-4 py-3 bg-[#0b0f1c]/95 backdrop-blur-md border-r border-white/[0.08] ${
            isNew ? "bg-[#96d6cd]/[0.08]" : ""
          }`}
        >
          <TokenLogo token={token} logoSrc={logoSrc} size="w-9 h-9" textSize="text-sm" />
          <div className="min-w-0">
            <h3
              className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              {token.name}
            </h3>
            <p className="text-[10px] text-slate-500 font-semibold font-mono truncate">${token.symbol ?? "—"}</p>
          </div>
        </div>

        {/* Scrollable data columns */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-24 shrink-0 text-right text-[11px] font-semibold font-mono tabular-nums" style={{ color: ACCENT }}>
            {displayPrice !== null ? `$${Number(displayPrice).toFixed(8)}` : "—"}
          </div>

          <div className="w-14 shrink-0 text-right"><ChangeValue /></div>
          <div className="w-14 shrink-0 text-right"><ChangeValue /></div>
          <div className="w-14 shrink-0 text-right"><ChangeValue /></div>
          <div className="w-14 shrink-0 text-right"><ChangeValue /></div>

          <div className="w-24 shrink-0 text-right text-slate-300 text-[11px] font-semibold font-mono tabular-nums">
            {compactNumberShort(displayMarketcap, "ETH")}
          </div>
          <div className="w-24 shrink-0 text-right text-slate-300 text-[11px] font-semibold font-mono tabular-nums">
            {compactNumberShort(displayVolume, "ETH")}
          </div>

          <div className="w-40 shrink-0">
            <CurveOrStatus token={token} />
          </div>

          <div className="w-28 shrink-0 flex justify-end" onClick={(e) => e.stopPropagation()}>
            <SocialLinks token={token} />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function TokenTable({ data }) {
  return (
    <GlassSurface className="rounded-[22px]">
      {/* This is the one scroll container — sticky positioning on the
          identity column resolves against it, so it stays pinned no
          matter how far right the rest of the row scrolls. */}
      <div className="overflow-x-auto">
        <TableHeader />
        <div>
          {data.map((token, index) => (
            <TokenRow key={token.address || token.id || index} token={token} index={index} isNew={token.isNew} />
          ))}
        </div>
      </div>
    </GlassSurface>
  );
}

/* --------------------------------------------------------------------
 * Grid view — unchanged card-per-token layout
 * ------------------------------------------------------------------ */

function TokenGrid({ data }) {
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {data.map((token, index) => (
        <div key={token.address || token.id || index} className="w-full h-full">
          <TokenCard token={token} index={index} isNew={token.isNew} />
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------
 * Public component
 * ------------------------------------------------------------------ */

export default function TokenList({ data = [], view = "grid" }) {
  if (!data.length) {
    return (
      <div className={`text-center py-14 rounded-[22px] border-dashed ${NESTED_FILL}`}>
        <p className="text-sm text-slate-400 font-medium">No tokens found</p>
        <p className="text-xs text-slate-600 mt-1">Try a different search or clear your filters.</p>
      </div>
    );
  }

  return view === "list" ? <TokenTable data={data} /> : <TokenGrid data={data} />;
}
