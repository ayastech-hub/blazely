import React, { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Send, User } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useWallet } from "../context/WalletContext";

// Helper to shorten wallet addresses
const shortenWallet = (address) => {
  if (!address) return "Anonymous";
  return `${address.substring(0, 6)}...${address.slice(-4)}`;
};

// Helper to format relative time
const timeAgo = (dateString, now = new Date()) => {
  if (!dateString) return "just now";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "just now";

  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return date.toLocaleDateString();
};

export default function Comments({ tokenAddress }) {
  const { wallet } = useWallet(); // ✅ ensures wallet is tracked
  const [list, setList] = useState([]);
  const [val, setVal] = useState("");
  const [toast, setToast] = useState(null);
  const [tokenCreator, setTokenCreator] = useState(null);
  const [now, setNow] = useState(new Date());

  const commentsStartRef = useRef(null);
  const commentsContainerRef = useRef(null);

  // Update relative timestamps every 5s
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);

  const scrollToTop = useCallback(() => {
    if (commentsStartRef.current) {
      commentsStartRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, []);

  const isScrolledToTop = useCallback(() => {
    const container = commentsContainerRef.current;
    return container ? container.scrollTop <= 50 : false;
  }, []);

  // Fetch token creator
  useEffect(() => {
    if (!tokenAddress) return;
    supabase
      .from("tokens")
      .select("creator_wallet")
      .eq("address", tokenAddress.toLowerCase())
      .maybeSingle()
      .then(({ data }) => {
        if (data?.creator_wallet)
          setTokenCreator(data.creator_wallet.toLowerCase());
      });
  }, [tokenAddress]);

  // Initial comments load + realtime subscription
  useEffect(() => {
    if (!tokenAddress) return;

    // Load existing comments
    supabase
      .from("comments")
      .select("*")
      .eq("token_address", tokenAddress)
      .order("created_at", { ascending: false })
      .then(({ data }) => setList(data || []));

    // Realtime subscription
    const channel = supabase
      .channel(`realtime_comments_${tokenAddress}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `token_address=eq.${tokenAddress}`,
        },
        (payload) => {
          const newComment = payload.new;
          const wasAtTop = isScrolledToTop();

          setList((prev) => {
            const exists = prev.some(
              (c) =>
                c.id === newComment.id ||
                (c.isTemporary &&
                  c.comment === newComment.comment &&
                  c.user_wallet === newComment.user_wallet)
            );

            if (exists) {
              return prev.map((c) =>
                c.isTemporary && c.comment === newComment.comment
                  ? { ...newComment, isTemporary: false }
                  : c
              );
            }
            return [newComment, ...prev];
          });

          if (wasAtTop) setTimeout(scrollToTop, 50);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [tokenAddress, isScrolledToTop, scrollToTop]);

  const showToast = (msg, type = "warning") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const addComment = async () => {
    // ✅ Block if wallet not connected
    if (!wallet) {
      showToast("⚠️ Connect your wallet first!");
      return;
    }

    if (!val.trim()) return;

    const content = val.trim();
    const nowISO = new Date().toISOString();

    const commentToInsert = {
      token_address: tokenAddress,
      user_wallet: wallet,
      comment: content,
      created_at: nowISO,
    };

    // Optimistic update
    const tempId = Date.now();
    setList((prev) => [
      { ...commentToInsert, id: tempId, isTemporary: true },
      ...prev,
    ]);
    setVal("");
    scrollToTop();

    const { error } = await supabase.from("comments").insert([commentToInsert]);
    if (error) {
      setList((prev) => prev.filter((c) => c.id !== tempId));
      showToast("Error posting comment.");
      console.error(error);
    }
  };

  const isCommentFromCreator = (addr) =>
    tokenCreator && addr?.toLowerCase() === tokenCreator;

  return (
    <div className="relative bg-[#0b0f19]/20 flex flex-col h-[480px] max-w-full overflow-hidden">
      {/* Toast Alert System styled with #96d6cd */}
      {toast && (
        <div 
          className="absolute top-2 left-1/2 -translate-x-1/2 px-4 py-1.5 text-[11px] font-bold rounded-md z-50 shadow-xl border border-[#96d6cd]/30 text-[#030712] backdrop-blur-md"
          style={{ backgroundColor: '#96d6cd' }}
        >
          {toast.msg}
        </div>
      )}

      {/* Terminal Title Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-900">
        <div className="flex items-center gap-2">
          <MessageCircle style={{ color: '#96d6cd' }} size={15} />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Protocol Network Feed
          </h3>
          <span 
            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-[#030712]/60 border-slate-800/60"
            style={{ color: '#96d6cd' }}
          >
            {list.length}
          </span>
        </div>
        <span className="text-[10px] text-slate-600 font-mono tracking-widest uppercase">Realtime Stream</span>
      </div>

      {/* Stream Terminal Content View */}
      <div
        ref={commentsContainerRef}
        className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
      >
        <div ref={commentsStartRef} />
        {list.length === 0 ? (
          <div className="text-center py-24 text-slate-600 font-mono text-[11px] uppercase tracking-wider">
            No secure feed packets found. Initialize discussion...
          </div>
        ) : (
          list.map((c) => (
            <div
              key={c.id}
              className={`transition-all duration-200 ${
                c.isTemporary ? "opacity-30 scale-[0.99]" : "opacity-100 scale-100"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded bg-slate-900 border border-slate-800 flex items-center justify-center">
                  <User size={10} className="text-slate-500" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-300 font-medium">
                    {shortenWallet(c.user_wallet)}
                  </span>
                  
                  {isCommentFromCreator(c.user_wallet) && (
                    <span 
                      className="text-[8px] border px-1.5 py-0.25 rounded-sm font-extrabold uppercase tracking-widest bg-[#96d6cd]/10"
                      style={{ color: '#96d6cd', borderColor: '#96d6cd/30' }}
                    >
                      dev
                    </span>
                  )}
                  
                  <span className="text-[9px] text-slate-600 font-mono">
                    • {timeAgo(c.created_at, now)}
                  </span>
                </div>
              </div>
              <div className="ml-7">
                <p 
                  className="text-slate-300 text-xs leading-relaxed bg-[#030712]/40 p-2.5 rounded border-l border-slate-800 hover:bg-[#030712]/70 transition-colors"
                  style={{ borderLeftColor: isCommentFromCreator(c.user_wallet) ? '#96d6cd' : 'rgb(30, 41, 59)' }}
                >
                  {c.comment}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Action Deck */}
      <div className="bg-[#030712]/60 p-3 rounded-lg border border-slate-900 shadow-sm">
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" &&
            !e.shiftKey &&
            (e.preventDefault(), addComment())
          }
          className="w-full bg-transparent text-slate-200 text-xs outline-none resize-none placeholder-slate-700 min-h-[44px]"
          placeholder={
            wallet ? "Broadcast secure comment block to ledger..." : "Access restricted. Connect wallet node..."
          }
          rows={2}
          maxLength={500}
          disabled={!wallet}
        />
        <div className="flex justify-between items-center pt-2 border-t border-slate-900/60">
          <span className="text-[10px] text-slate-600 font-mono">
            {val.length}/500
          </span>
          <button
            onClick={addComment}
            disabled={!val.trim() || !wallet}
            style={{ 
              backgroundColor: val.trim() && wallet ? '#96d6cd' : '',
            }}
            className="disabled:bg-slate-900 disabled:text-slate-600 text-[#030712] hover:opacity-90 transition-all duration-150 px-3.5 py-1.5 rounded font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5"
          >
            <span className={!val.trim() || !wallet ? "text-slate-600" : "text-[#030712]"}>
              Broadcast
            </span> 
            <Send size={10} className={!val.trim() || !wallet ? "text-slate-600" : "text-[#030712]"} />
          </button>
        </div>
      </div>
    </div>
  );
}
