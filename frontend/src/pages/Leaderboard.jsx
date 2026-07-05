import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabaseClient"; 
import { Star, ChevronRight } from "lucide-react";
import { normalizeToken } from "../api/supabaseTokens"; // Using your API normalization

const formatNumberCompact = (num) => {
  if (num === null || num === undefined) return "$0.00";
  const number = Number(num);
  if (isNaN(number) || number === 0) return "$0.00";
  
  const abs = Math.abs(number);
  if (abs < 1000) return `$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const suffixes = ["", "K", "M", "B", "T"];
  const i = Math.floor(Math.log10(abs) / 3);
  const scaled = abs / Math.pow(1000, i);
  let numericDisplay = Math.round(scaled * 10) / 10;
  return `$${numericDisplay.toFixed(1)}${suffixes[i]}`;
};

const LeaderboardRow = ({ t, idx }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative block"
    >
      <Link to={`/token/${t.address}`} className="relative flex items-center bg-[#0d121f]/30 border border-slate-900 rounded-lg p-4 transition-all hover:bg-[#121829]/60 group">
        <div className="w-full grid grid-cols-12 gap-4 items-center">
          <div className="col-span-1 text-xs font-semibold text-slate-500 pl-1">{idx + 1}</div>
          
          <div className="col-span-8 md:col-span-5 flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#030712] border border-slate-800 flex items-center justify-center overflow-hidden">
              {t.logo ? <img src={t.logo} className="w-full h-full object-cover" /> : <div className="text-[10px]">{t.symbol[0]}</div>}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-200 truncate">{t.name}</div>
              <div className="text-[11px] text-slate-600 font-mono">{t.address.slice(0,6)}...{t.address.slice(-4)}</div>
            </div>
          </div>

          <div className="hidden md:flex md:col-span-3 justify-end text-sm text-slate-300">{formatNumberCompact(t.volume_24h)}</div>
          <div className="col-span-3 md:col-span-2 flex justify-end text-sm font-semibold text-slate-200">{formatNumberCompact(t.marketcap_usd)}</div>
          <div className="col-span-1 hidden md:flex justify-end pr-1"><ChevronRight size={14} className="text-slate-600" /></div>
        </div>
      </Link>
    </motion.div>
  );
};

export default function Leaderboard() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("marketcap_usd"); 

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      setLoading(true);
      // Fetching from the main 'tokens' table with the metrics join
      const { data, error } = await supabase
        .from("tokens")
        .select(`*, token_metrics_latest(*)`);
      
      if (!error && data) {
        const normalized = data.map(normalizeToken);
        const sorted = [...normalized].sort((a, b) => b[sortBy] - a[sortBy]);
        setTokens(sorted);
      }
      setLoading(false);
    };
    fetchLeaderboardData();
  }, [sortBy]);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 p-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex justify-end gap-2 mb-6">
          <button onClick={() => setSortBy("marketcap_usd")} className={`px-4 py-2 rounded-lg text-xs ${sortBy === 'marketcap_usd' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-900'}`}>Market Cap</button>
          <button onClick={() => setSortBy("volume_24h")} className={`px-4 py-2 rounded-lg text-xs ${sortBy === 'volume_24h' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-900'}`}>Volume</button>
        </div>
        <div className="space-y-2">
          {tokens.map((t, i) => <LeaderboardRow key={t.address} t={t} idx={i} />)}
        </div>
      </div>
    </div>
  );
}
