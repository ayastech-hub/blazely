// src/pages/Bounty.jsx
//
// Community task bounty board: creators post paid tasks (design, content,
// moderation, etc.), the community submits entries, the creator picks a
// winner and the reward is paid out. UI-only for now — see
// lib/mockContractFunctions.js for the note on what's mocked.
//
// Redesigned after researching how real bounty platforms (Gitcoin, Dework,
// BountyBoard) actually structure this: a proper status pipeline (open →
// in review → completed, not a flat open/claimed toggle), category
// filtering, a deadline per bounty, and a summary bar up top instead of
// jumping straight into a card grid.
import React, { useEffect, useMemo, useState } from "react";
import { Trophy, Sparkles, Users, MessageSquare, Palette, Plus, ShieldCheck, Clock, Coins } from "lucide-react";
import Loading from "../components/ui/Loading";
import { GlassCard } from "../components/ui/GlassCard";
import { mockContractFunctions } from "../lib/mockContractFunctions";

const CATEGORY_ICON = { Design: Palette, Content: MessageSquare, Moderation: Users };
const CATEGORIES = ["All", "Design", "Content", "Moderation"];

const STATUS = {
  open: { label: "Open", color: "var(--teal)", bg: "rgba(150,214,205,0.10)" },
  in_review: { label: "In Review", color: "var(--amber)", bg: "var(--amber-deep)" },
  completed: { label: "Completed", color: "var(--text-faint-2)", bg: "var(--panel-alt)" },
};

function daysLeft(deadline) {
  const diff = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "Closed";
  if (diff === 0) return "Due today";
  return `${diff}d left`;
}

function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)]">
      <div className="w-9 h-9 flex items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: "rgba(150,214,205,0.10)", color: "var(--teal)" }}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="text-[15px] font-bold text-[var(--text-bright)] tabular-nums font-mono truncate">{value}</div>
        <div className="text-[10px] uppercase tracking-wide text-[var(--text-faint-2)]">{label}</div>
      </div>
    </div>
  );
}

function BountyCard({ bounty, onSubmit }) {
  const Icon = CATEGORY_ICON[bounty.category] || Sparkles;
  const status = STATUS[bounty.status] || STATUS.open;
  const isOpen = bounty.status === "open";

  return (
    <GlassCard className="rounded-2xl p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 flex items-center justify-center rounded-xl shrink-0" style={{ backgroundColor: "rgba(150,214,205,0.10)", color: "var(--teal)" }}>
              <Icon size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint-2)]">
                {bounty.category}
              </span>
              <h3 className="text-[13px] font-semibold text-[var(--text-bright)] leading-snug mt-0.5 line-clamp-2">
                {bounty.title}
              </h3>
            </div>
          </div>
          <span
            className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-2 py-1 rounded-full"
            style={{ color: status.color, backgroundColor: status.bg, border: `1px solid ${status.color}` }}
          >
            {status.label}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-[var(--text-faint-2)] mb-4">
          <span className="flex items-center gap-1">
            <Users size={11} /> {bounty.submissions} submission{bounty.submissions === 1 ? "" : "s"}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} /> {daysLeft(bounty.deadline)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
        <div>
          <span className="text-lg font-bold tabular-nums font-mono text-[var(--text-bright)]">
            {bounty.rewardEth}
          </span>
          <span className="text-[11px] text-[var(--text-faint-2)] ml-1">ETH</span>
        </div>
        <button
          onClick={() => onSubmit(bounty)}
          disabled={!isOpen}
          className="px-4 py-2 rounded-xl text-xs font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: isOpen ? "var(--teal)" : "var(--panel)",
            color: isOpen ? "var(--bg)" : "var(--text-faint-2)",
          }}
        >
          {isOpen ? "Submit Entry" : status.label}
        </button>
      </div>
    </GlassCard>
  );
}

export default function Bounty() {
  const [bounties, setBounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");

  useEffect(() => {
    mockContractFunctions.getBounties().then((data) => {
      setBounties(data);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (bounty) => {
    await mockContractFunctions.submitBountyEntry(bounty.id, "");
    setBounties((prev) =>
      prev.map((b) => (b.id === bounty.id ? { ...b, submissions: b.submissions + 1 } : b))
    );
  };

  const filtered = useMemo(
    () => (category === "All" ? bounties : bounties.filter((b) => b.category === category)),
    [bounties, category]
  );

  const stats = useMemo(() => {
    const open = bounties.filter((b) => b.status === "open");
    const totalReward = bounties.reduce((sum, b) => sum + Number(b.rewardEth || 0), 0);
    return {
      openCount: open.length,
      totalReward: totalReward.toFixed(2),
      submissions: bounties.reduce((sum, b) => sum + (b.submissions || 0), 0),
    };
  }, [bounties]);

  return (
    <div className="relative flex flex-col text-[var(--text-bright)]">
      <div className="px-4 sm:px-6 lg:px-8 max-w-[1200px] mx-auto w-full flex-1 pt-6 pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl shrink-0" style={{ backgroundColor: "rgba(150,214,205,0.10)", color: "var(--teal)" }}>
              <Trophy size={18} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-bright)]">Bounty Board</h1>
              <p className="text-xs mt-0.5 text-[var(--text-faint-2)]">
                Complete a task, get paid — no created token required.
              </p>
            </div>
          </div>
          <button
            className="px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
            style={{ backgroundColor: "var(--teal)", color: "var(--bg)" }}
          >
            <Plus size={14} /> Post a Bounty
          </button>
        </div>

        {/* Summary stats — orients before diving into the list, matching how
            real bounty boards (Gitcoin, Dework) open with pool/activity
            totals rather than a bare grid of cards. */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatTile icon={Sparkles} label="Open bounties" value={stats.openCount} />
          <StatTile icon={Coins} label="Total reward pool" value={`${stats.totalReward} ETH`} />
          <StatTile icon={Users} label="Submissions" value={stats.submissions} />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-5 scrollbar-hide">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold transition-colors border"
              style={
                category === c
                  ? { backgroundColor: "rgba(150,214,205,0.10)", borderColor: "var(--teal)", color: "var(--text-bright)" }
                  : { backgroundColor: "var(--panel-alt)", borderColor: "var(--border)", color: "var(--text-faint-2)" }
              }
            >
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <Loading label="Loading bounties..." />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[var(--border)] rounded-2xl">
            <span className="text-sm text-[var(--text-faint-2)]">No bounties in this category yet.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((bounty) => (
              <BountyCard key={bounty.id} bounty={bounty} onSubmit={handleSubmit} />
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 p-4 rounded-xl text-xs mt-6 bg-[var(--panel-alt)] border border-[var(--border)] text-[var(--text-faint-2)]">
          <ShieldCheck size={14} style={{ color: "var(--teal)" }} className="shrink-0" />
          The bounty board is a UI preview — posting, submissions, and payouts are mocked until the escrow/payout contract logic is wired up.
        </div>
      </div>
    </div>
  );
}
