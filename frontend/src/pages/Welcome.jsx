import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, Terminal, Rocket, Lock, Layers, RefreshCcw, ArrowRight, ShieldCheck } from "lucide-react";

const STEPS = [
  { n: "01", label: "Deploy a token via bonding curve — no presale, fair launch only." },
  { n: "02", label: "Buy or sell at any time. Price moves with the curve." },
  { n: "03", label: "At $69K market cap, liquidity auto-migrates to DEX." },
  { n: "04", label: "LP tokens are burned. Liquidity is permanent." },
];

export default function Welcome({ onDismiss }) {
  const navigate = useNavigate();
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => {
    const hasOptedOut = localStorage.getItem("hideWelcomeScreen");
    if (hasOptedOut === "true") {
      onDismiss ? onDismiss() : navigate("/", { replace: true });
    }
  }, [navigate, onDismiss]);

  const handleEnterApp = () => {
    if (dontShowAgain) localStorage.setItem("hideWelcomeScreen", "true");
    onDismiss ? onDismiss() : navigate("/");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#030712",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      padding: "16px",
      position: "relative",
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .cursor::after {
          content: '_';
          animation: blink 1s step-end infinite;
          color: #00FFB2;
          margin-left: 2px;
        }
        .crt-scanline {
          position: fixed; inset: 0; pointer-events: none; z-index: 9999;
          background: repeating-linear-gradient(
            to bottom,
            transparent 0px,
            transparent 3px,
            rgba(0,0,0,0.08) 3px,
            rgba(0,0,0,0.08) 4px
          );
        }
        .step-row:not(:last-child) {
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .enter-btn:hover { background: #00e8a0 !important; }
        .enter-btn:active { transform: scale(0.98); }
        .enter-btn { transition: background 0.15s, transform 0.1s; }
      `}} />

      <div className="crt-scanline" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#060a12",
          border: "1px solid #0d1520",
          borderRadius: 4,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* ── HERO IMAGE ZONE ── */}
        <div style={{
          width: "100%",
          height: 200,
          background: "linear-gradient(160deg, #060e1a 0%, #030a0f 60%, #040d0a 100%)",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderBottom: "1px solid #0d1520",
        }}>
          {/* grid bg */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `
              linear-gradient(rgba(0,255,178,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,255,178,0.04) 1px, transparent 1px)
            `,
            backgroundSize: "32px 32px",
          }} />
          {/* glow */}
          <div style={{
            position: "absolute",
            width: 220, height: 220,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,255,178,0.07) 0%, transparent 70%)",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
          }} />

          {/* centre emblem */}
          <div style={{ position: "relative", textAlign: "center" }}>
            <div style={{
              width: 72, height: 72,
              border: "1px solid rgba(0,255,178,0.25)",
              borderRadius: 4,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 12px",
              background: "rgba(0,255,178,0.04)",
              position: "relative",
            }}>
              {/* corner ticks */}
              {[["0 0","top","left"],["0 0","top","right"],["0 0","bottom","left"],["0 0","bottom","right"]].map(([,v,h],i) => (
                <div key={i} style={{
                  position: "absolute", width: 8, height: 8,
                  [v]: -1, [h]: -1,
                  borderTop: v === "top" ? "2px solid #00FFB2" : "none",
                  borderBottom: v === "bottom" ? "2px solid #00FFB2" : "none",
                  borderLeft: h === "left" ? "2px solid #00FFB2" : "none",
                  borderRight: h === "right" ? "2px solid #00FFB2" : "none",
                }} />
              ))}
              <Rocket style={{ width: 28, height: 28, color: "#00FFB2" }} />
            </div>
            <div style={{
              fontSize: 10, color: "#00FFB2", letterSpacing: "0.3em",
              fontWeight: 700, textTransform: "uppercase", opacity: 0.7,
            }}>
              LAUNCHPAD / BASE CHAIN
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div style={{ padding: "20px 20px 24px" }}>

          {/* title */}
          <div className="cursor" style={{
            fontSize: 15, fontWeight: 700, color: "#e2e8f0",
            letterSpacing: "0.12em", textTransform: "uppercase",
            marginBottom: 4,
          }}>
            TOKEN FACTORY & LIQUIDITY ENGINE
          </div>
          <div style={{
            fontSize: 10, color: "#475569", letterSpacing: "0.2em",
            textTransform: "uppercase", marginBottom: 20,
          }}>
            FAIR-LAUNCH BONDING CURVE PROTOCOL
          </div>

          {/* ── HOW IT WORKS ── */}
          <div style={{
            border: "1px solid #0d1a26",
            borderRadius: 3,
            marginBottom: 16,
            overflow: "hidden",
          }}>
            <div style={{
              padding: "8px 12px",
              borderBottom: "1px solid #0d1a26",
              fontSize: 9, fontWeight: 700,
              color: "#00FFB2", letterSpacing: "0.25em",
              textTransform: "uppercase",
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(0,255,178,0.03)",
            }}>
              <Terminal style={{ width: 11, height: 11 }} />
              HOW IT WORKS
            </div>
            {STEPS.map((s, i) => (
              <div key={i} className="step-row" style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "10px 12px",
              }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, color: "#00FFB2",
                  letterSpacing: "0.1em", minWidth: 20, paddingTop: 1,
                  opacity: 0.7,
                }}>{s.n}</span>
                <span style={{
                  fontSize: 10, color: "#64748b", lineHeight: 1.6,
                  textTransform: "uppercase", letterSpacing: "0.05em",
                }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* ── DISCLAIMER ── */}
          <div style={{
            padding: "10px 12px",
            background: "rgba(245,158,11,0.04)",
            border: "1px solid rgba(245,158,11,0.1)",
            borderRadius: 3,
            marginBottom: 20,
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 9, fontWeight: 700, color: "rgba(245,158,11,0.7)",
              letterSpacing: "0.25em", textTransform: "uppercase",
              marginBottom: 6,
            }}>
              <AlertTriangle style={{ width: 11, height: 11 }} />
              RISK DISCLOSURE
            </div>
            <p style={{
              fontSize: 10, color: "#475569", lineHeight: 1.65,
              textTransform: "uppercase", letterSpacing: "0.04em", margin: 0,
            }}>
              Tokens launched via bonding curves are highly speculative. Verify all migration parameters and locking schedules before deployment. Proceed at your own risk.
            </p>
          </div>

          {/* ── CTA ── */}
          <button
            className="enter-btn"
            onClick={handleEnterApp}
            style={{
              width: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: "#00FFB2",
              color: "#030712",
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              border: "none",
              borderRadius: 3,
              padding: "13px 16px",
              cursor: "pointer",
            }}
          >
            INITIALIZE TERMINAL
            <ArrowRight style={{ width: 13, height: 13 }} />
          </button>

          {/* ── HIDE TOGGLE ── */}
          <div
            onClick={() => setDontShowAgain(!dontShowAgain)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              marginTop: 14, cursor: "pointer",
            }}
          >
            <div style={{
              width: 12, height: 12,
              border: `1px solid ${dontShowAgain ? "#00FFB2" : "#1e293b"}`,
              borderRadius: 2,
              background: dontShowAgain ? "rgba(0,255,178,0.1)" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}>
              {dontShowAgain && (
                <div style={{ width: 6, height: 6, background: "#00FFB2", borderRadius: 1 }} />
              )}
            </div>
            <span style={{
              fontSize: 9, color: "#334155",
              letterSpacing: "0.2em", textTransform: "uppercase",
            }}>
              DON'T SHOW AGAIN
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
