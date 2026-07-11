/**
 * components/tokenpage/CommentsPanel.jsx
 * Real comments from the `comments` table, restyled to match the preview's layout. Bug fixed
 * from your original Comments.jsx: `user_wallet` is now lowercased on insert — it was stored
 * as whatever case the wallet connector returned, which then failed to match
 * `isCommentFromCreator` comparisons elsewhere (creator_wallet is stored lowercased
 * everywhere else in this schema).
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import { C } from "../../utils/designTokens";
import { Icon } from "./Icons";
import { supabase } from "../../lib/supabaseClient";
import { useWallet } from "../../context/WalletContext";
import { timeAgo } from "../../utils/format";

export default function CommentsPanel({ tokenAddress, creatorWallet }) {
  const { wallet } = useWallet();
  const [list, setList] = useState([]);
  const [text, setText] = useState("");
  const [now, setNow] = useState(Date.now());
  const containerRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!tokenAddress) return;
    const normalized = tokenAddress.toLowerCase();

    supabase
      .from("comments")
      .select("*")
      .eq("token_address", normalized)
      .order("created_at", { ascending: false })
      .then(({ data }) => setList(data || []));

    const channel = supabase
      .channel(`comments-${normalized}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `token_address=eq.${normalized}` },
        (payload) => {
          setList((prev) => {
            if (prev.some((c) => c.id === payload.new.id)) return prev;
            return [payload.new, ...prev.filter((c) => !c.isTemporary)];
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [tokenAddress]);

  const addComment = useCallback(async () => {
    if (!wallet || !text.trim()) return;
    const normalizedWallet = wallet.toLowerCase(); // fixed: was inserted with original casing before
    const content = text.trim();
    const tempId = `temp-${Date.now()}`;

    setList((prev) => [
      { id: tempId, token_address: tokenAddress.toLowerCase(), user_wallet: normalizedWallet, comment: content, created_at: new Date().toISOString(), isTemporary: true },
      ...prev,
    ]);
    setText("");

    const { error } = await supabase.from("comments").insert([
      { token_address: tokenAddress.toLowerCase(), user_wallet: normalizedWallet, comment: content },
    ]);
    if (error) {
      setList((prev) => prev.filter((c) => c.id !== tempId));
      console.error("Failed to post comment:", error);
    }
  }, [wallet, text, tokenAddress]);

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div ref={containerRef} style={{ overflowY: "auto", flex: 1 }}>
        {list.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: C.mid, fontSize: 11, fontFamily: C.mono }}>
            No comments yet. Start the discussion.
          </div>
        ) : (
          list.map((c) => {
            const isCreator = creatorWallet && c.user_wallet?.toLowerCase() === creatorWallet.toLowerCase();
            return (
              <div
                key={c.id}
                style={{ padding: "11px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 9, alignItems: "flex-start", opacity: c.isTemporary ? 0.5 : 1 }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 5,
                    flexShrink: 0,
                    background: C.panel2,
                    border: `1px solid ${C.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    fontWeight: 700,
                    color: C.teal,
                    fontFamily: C.mono,
                  }}
                >
                  {c.user_wallet?.slice(2, 4).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, color: C.teal, fontFamily: C.mono, fontWeight: 700 }}>
                      {c.user_wallet?.slice(0, 6)}...{c.user_wallet?.slice(-4)}
                    </span>
                    {isCreator && (
                      <span style={{ fontSize: 8, fontWeight: 700, color: C.teal, background: C.tealDim, border: `1px solid ${C.teal}`, borderRadius: 3, padding: "1px 4px", fontFamily: C.mono }}>
                        DEV
                      </span>
                    )}
                    <span style={{ fontSize: 8, color: C.dim, fontFamily: C.mono, marginLeft: "auto" }}>{timeAgo(c.created_at, now)} ago</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: C.sub, lineHeight: 1.6 }}>{c.comment}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ padding: "9px 14px", background: C.panel, borderTop: `1px solid ${C.border}`, display: "flex", gap: 9, alignItems: "center" }}>
        <div style={{ flex: 1, background: C.bgDeep, border: `1px solid ${C.borderHi}`, borderRadius: 5, padding: "8px 12px" }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addComment()}
            placeholder={wallet ? "Share your analysis..." : "Connect wallet to comment"}
            disabled={!wallet}
            style={{ width: "100%", background: "none", border: "none", outline: "none", color: C.text, fontSize: 11, fontFamily: C.sans }}
          />
        </div>
        <button
          onClick={addComment}
          disabled={!text.trim() || !wallet}
          style={{
            background: text.trim() && wallet ? C.teal : C.panel2,
            border: `1px solid ${text.trim() && wallet ? C.teal : C.border}`,
            borderRadius: 5,
            padding: "8px 13px",
            color: text.trim() && wallet ? "#030712" : C.dim,
            fontSize: 10,
            fontWeight: 700,
            cursor: text.trim() && wallet ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontFamily: C.mono,
          }}
        >
          <Icon.Send />
        </button>
      </div>
    </div>
  );
}
