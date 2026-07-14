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

/* --------------------------------------------------------------------
 * List (table) view
 *
 * One shared container, one header row, and every token as an aligned
 * row underneath — not a stack of individually-styled cards. Column
 * widths/visibility are defined once in LIST_COLUMNS so the header and
 * every row can never drift out of alignment with each other.
 * ------------------------------------------------------------------ */

const LIST_COLUMNS = [
  { key: "token", label: "Token", className: "flex-1 min-w-0" },
  { key: "price", label: "Price", className: "hidden sm:flex w-24 shrink-0 justify-end" },
  { key: "5m", label: "5M", className: "hidden md:flex w-12 shrink-0 justify-end" },
  { key: "1h", label: "1H", className: "hidden md:flex w-12 shrink-0 justify-end" },
  { key: "6h", label: "6H", className: "hidden md:flex w-12 shrink-0 justify-end" },
  { key: "24h", label: "24H", className: "hidden md:flex w-12 shrink-0 justify-end" },
  { key: "mcap", label: "Mcap", className: "hidden lg:flex w-24 shrink-0 justify-end" },
  { key: "vol", label: "Volume", className: "hidden lg:flex w-24 shrink-0 justify-end" },
  { key: "status", label: "Curve / Status", className: "hidden xl:flex w-36 shrink-0" },
  { key: "links", label: "Links", className: "hidden xl:flex w-24 shrink-0 justify-end" },
];

function TableHeader() {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.08] text-[9px] uppercase tracking-widest text-slate-500 font-bold"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {LIST_COLUMNS.map((col) => (
        <div key={col.key} className={col.className}>
          {col.label}
        </div>
      ))}
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
      className={`border-b border-white/[0.05] last:border-b-0 transition-colors duration-300 ${
        isNew ? "bg-teal/[0.05]" : "hover:bg-white/[0.035]"
      }`}
    >
      <Link to={`/token/${token.address}`} className="flex items-center gap-3 px-4 py-3 group">
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <TokenLogo token={token} logoSrc={logoSrc} size="w-9 h-9" textSize="text-sm" />
          <div className="min-w-0">
            <h3
              className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              {token.name}
            </h3>
            <p
              className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              ${token.symbol ?? "—"}
            </p>
          </div>
        </div>

        <div
          className="hidden sm:flex w-24 shrink-0 justify-end text-teal text-[11px] font-bold tabular-nums"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {displayPrice !== null ? `$${Number(displayPrice).toFixed(8)}` : "—"}
        </div>

        <div className="hidden md:flex w-12 shrink-0 justify-end">
          <ChangeValue />
        </div>
        <div className="hidden md:flex w-12 shrink-0 justify-end">
          <ChangeValue />
        </div>
        <div className="hidden md:flex w-12 shrink-0 justify-end">
          <ChangeValue />
        </div>
        <div className="hidden md:flex w-12 shrink-0 justify-end">
          <ChangeValue />
        </div>

        <div
          className="hidden lg:flex w-24 shrink-0 justify-end text-slate-300 text-[11px] font-bold tabular-nums"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {compactNumberShort(displayMarketcap, "ETH")}
        </div>
        <div
          className="hidden lg:flex w-24 shrink-0 justify-end text-slate-300 text-[11px] font-bold tabular-nums"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {compactNumberShort(displayVolume, "ETH")}
        </div>

        <div className="hidden xl:flex w-36 shrink-0">
          <CurveOrStatus token={token} />
        </div>

        <div className="hidden xl:flex w-24 shrink-0 justify-end" onClick={(e) => e.stopPropagation()}>
          <SocialLinks token={token} />
        </div>
      </Link>
    </motion.div>
  );
}

function TokenTable({ data }) {
  return (
    <GlassSurface className="rounded-2xl">
      <TableHeader />
      <div>
        {data.map((token, index) => (
          <TokenRow
            key={token.address || token.id || index}
            token={token}
            index={index}
            isNew={token.isNew}
          />
        ))}
      </div>
    </GlassSurface>
  );
}

/* --------------------------------------------------------------------
 * Grid view — unchanged card-per-token layout
 * ------------------------------------------------------------------ */

function TokenGrid({ data }) {
  return (
    <div className="font-mono grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
      <div className="text-center py-12 border border-dashed border-white/[0.08] bg-white/[0.02] backdrop-blur-md text-slate-600 font-bold tracking-widest text-[10px] uppercase rounded-2xl">
        NULL DESCRIPTOR // NO COMPLIANT TOKENS DETECTED
      </div>
    );
  }

  return view === "list" ? <TokenTable data={data} /> : <TokenGrid data={data} />;
}