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
    <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-4 rounded-2xl border border-slate-800/70 h-full flex flex-col max-h-[500px] shadow-2xl">
      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 text-xs rounded-full z-50 animate-bounce bg-cyan-500 text-white shadow-lg font-bold">
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="text-cyan-400" size={20} />
          <h3 className="text-lg font-bold text-white tracking-tight">
            Discussion
          </h3>
          <span className="bg-slate-800 text-cyan-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-700">
            {list.length}
          </span>
        </div>
      </div>

      <div
        ref={commentsContainerRef}
        className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
      >
        <div ref={commentsStartRef} />
        {list.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            No comments yet. Be the first!
          </div>
        ) : (
          list.map((c) => (
            <div
              key={c.id}
              className={`group transition-all duration-300 ${
                c.isTemporary ? "opacity-40 scale-95" : "opacity-100 scale-100"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center border border-slate-600 shadow-inner">
                  <User size={12} className="text-slate-300" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-semibold text-slate-200">
                      {shortenWallet(c.user_wallet)}
                    </span>
                    {isCommentFromCreator(c.user_wallet) && (
                      <span className="text-[9px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-1.5 rounded-sm font-black uppercase tracking-tighter">
                        dev
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 uppercase font-bold">
                    {timeAgo(c.created_at, now)}
                  </span>
                </div>
              </div>
              <div className="ml-8 relative">
                <p className="text-slate-300 text-xs leading-relaxed bg-slate-800/40 p-2.5 rounded-tr-xl rounded-br-xl rounded-bl-xl border-l-2 border-cyan-500/50 shadow-sm group-hover:bg-slate-800/60 transition-colors">
                  {c.comment}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-700/50 shadow-inner">
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" &&
            !e.shiftKey &&
            (e.preventDefault(), addComment())
          }
          className="w-full bg-transparent text-white text-xs outline-none resize-none placeholder-slate-600 mb-2"
          placeholder={
            wallet ? "Share your thoughts..." : "Please connect wallet..."
          }
          rows={2}
          maxLength={500}
          disabled={!wallet}
        />
        <div className="flex justify-between items-center pt-1 border-t border-slate-800">
          <span className="text-[10px] text-slate-600 font-medium">
            {val.length}/500
          </span>
          <button
            onClick={addComment}
            disabled={!val.trim() || !wallet}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-4 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-2 text-[11px] font-bold shadow-lg shadow-cyan-900/20"
          >
            POST <Send size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
