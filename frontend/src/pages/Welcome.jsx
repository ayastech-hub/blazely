//src/components/Welcome.jsx                          

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Terminal,
  Rocket,
  ArrowRight,
} from "lucide-react";

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
    <div
      style={{
        minHeight: "100vh",
        background: "#030712",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: "16px",
        position: "relative",
      }}
    >
      {/* ── Inject fonts + keyframes (preserved from original) ── */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes aurora-drift {
          0%,100% { transform: translate(0,0) scale(1); opacity:0.5; }
          50% { transform: translate(20px,-15px) scale(1.1); opacity:0.8; }
        }
        .cursor::after {
          content: '_';
          animation: blink 1s step-end infinite;
          color: #96d6cd;
          margin-left: 2px;
        }
        .crt-scanline {
          position: fixed; inset: 0; pointer-events: none; z-index: 9999;
          background: repeating-linear-gradient(
            to bottom,
            transparent 0px,
            transparent 3px,
            rgba(0,0,0,0.06) 3px,
            rgba(0,0,0,0.06) 4px
          );
        }
        .step-row:not(:last-child) {
          border-bottom: 1px solid rgba(30,41,59,0.4);
        }
        .enter-btn { transition: all 0.3s cubic-bezier(0.16,1,0.3,1); }
        .enter-btn:hover {
          background: #5eead4 !important;
          box-shadow: 0 0 50px rgba(150,214,205,0.45) !important;
          transform: translateY(-1px);
        }
        .enter-btn:active { transform: scale(0.98); }
        .enter-btn .shine {
          position: absolute; inset: 0;
          background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%);
          transform: translateX(-150%);
          transition: transform 0.6s ease;
        }
        .enter-btn:hover .shine { transform: translateX(150%); }
      `,
        }}
      />
      <div className="crt-scanline" />

      {/* ── Ambient aurora orbs ── */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "10%",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(150,214,205,0.06) 0%, transparent 70%)",
          filter: "blur(80px)",
          animation: "aurora-drift 18s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "15%",
          right: "10%",
          width: 280,
          height: 280,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(251,191,36,0.03) 0%, transparent 70%)",
          filter: "blur(90px)",
          animation: "aurora-drift 22s ease-in-out infinite reverse",
          pointerEvents: "none",
        }}
      />

      {/* ── Main card ── */}
      <motion.div
        initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "rgba(10,15,28,0.72)",
          backdropFilter: "blur(20px) saturate(140%)",
          WebkitBackdropFilter: "blur(20px) saturate(140%)",
          border: "1px solid rgba(148,163,184,0.12)",
          borderRadius: 16,
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* ── HERO IMAGE ZONE ── */}
        <div
          style={{
            width: "100%",
            height: 220,
            background: "linear-gradient(160deg, #060e1a 0%, #030a0f 60%, #040d0a 100%)",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid rgba(30,41,59,0.5)",
          }}
        >
          {/* grid bg */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `
              linear-gradient(rgba(150,214,205,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(150,214,205,0.04) 1px, transparent 1px)
            `,
              backgroundSize: "32px 32px",
            }}
          />
          {/* glow */}
          <div
            style={{
              position: "absolute",
              width: 240,
              height: 240,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(150,214,205,0.08) 0%, transparent 70%)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
          {/* centre emblem */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: "relative", textAlign: "center" }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                border: "1px solid rgba(150,214,205,0.3)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
                background: "rgba(150,214,205,0.05)",
                position: "relative",
                boxShadow: "0 0 40px rgba(150,214,205,0.12)",
              }}
            >
              {/* corner ticks */}
              {
                [
                  ["top", "left"],
                  ["top", "right"],
                  ["bottom", "left"],
                  ["bottom", "right"],
                ].map(([v, h], i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      width: 10,
                      height: 10,
                      [v]: -1,
                      [h]: -1,
                      borderTop: v === "top" ? "2px solid #96d6cd" : "none",
                      borderBottom: v === "bottom" ? "2px solid #96d6cd" : "none",
                      borderLeft: h === "left" ? "2px solid #96d6cd" : "none",
                      borderRight: h === "right" ? "2px solid #96d6cd" : "none",
                    }}
                  />
                ))
              }
              <Rocket style={{ width: 30, height: 30, color: "#96d6cd" }} />
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: "#96d6cd",
                letterSpacing: "0.3em",
                fontWeight: 600,
                textTransform: "uppercase",
                opacity: 0.8,
              }}
            >
              LAUNCHPAD / BASE CHAIN
            </div>
          </motion.div>
        </div>

        {/* ── BODY ── */}
        <div style={{ padding: "24px 24px 28px" }}>
          {/* title — editorial serif */}
          <div
            className="cursor"
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 22,
              fontWeight: 400,
              color: "#f1f5f9",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              marginBottom: 6,
            }}
          >
            Token Factory & Liquidity Engine
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: "#64748b",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: 24,
            }}
          >
            FAIR-LAUNCH BONDING CURVE PROTOCOL
          </div>

          {/* ── HOW IT WORKS ── */}
          <div
            style={{
              border: "1px solid rgba(30,41,59,0.6)",
              borderRadius: 10,
              marginBottom: 18,
              overflow: "hidden",
              background: "rgba(3,7,18,0.4)",
            }}
          >
            <div
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid rgba(30,41,59,0.6)",
                fontSize: 9,
                fontWeight: 700,
                color: "#96d6cd",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(150,214,205,0.04)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              <Terminal style={{ width: 12, height: 12 }} />
              HOW IT WORKS
            </div>
            {STEPS.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="step-row"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  padding: "12px 14px",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontSize: 16,
                    fontWeight: 300,
                    color: "rgba(150,214,205,0.6)",
                    letterSpacing: "0.05em",
                    minWidth: 24,
                    paddingTop: 0,
                    lineHeight: 1,
                  }}
                >
                  {s.n}
                </span>
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12,
                    color: "#94a3b8",
                    lineHeight: 1.6,
                    letterSpacing: "0.01em",
                    textTransform: "none",
                  }}
                >
                  {s.label}
                </span>
              </motion.div>
            ))}
          </div>

          {/* ── DISCLAIMER ── */}
          <div
            style={{
              padding: "12px 14px",
              background: "rgba(251,191,36,0.04)",
              border: "1px solid rgba(251,191,36,0.12)",
              borderRadius: 10,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 9,
                fontWeight: 700,
                color: "rgba(251,191,36,0.8)",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                marginBottom: 8,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              <AlertTriangle style={{ width: 12, height: 12 }} />
              RISK DISCLOSURE
            </div>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                color: "#64748b",
                lineHeight: 1.65,
                letterSpacing: "0.01em",
                textTransform: "none",
                margin: 0,
              }}
            >
              Tokens launched via bonding curves are highly speculative. Verify
              all migration parameters and locking schedules before deployment.
              Proceed at your own risk.
            </p>
          </div>

          {/* ── CTA — magnetic-style button ── */}
          <button
            className="enter-btn"
            onClick={handleEnterApp}
            style={{
              position: "relative",
              overflow: "hidden",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              background: "#96d6cd",
              color: "#030712",
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              border: "none",
              borderRadius: 999,
              padding: "15px 20px",
              cursor: "pointer",
            }}
          >
            <span className="shine" />
            INITIALIZE TERMINAL
            <ArrowRight style={{ width: 14, height: 14, position: "relative" }} />
          </button>

          {/* ── HIDE TOGGLE ── */}
          <div
            onClick={() => setDontShowAgain(!dontShowAgain)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginTop: 18,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                border: `1px solid ${dontShowAgain ? "#96d6cd" : "rgba(30,41,59,0.8)"}`,
                borderRadius: 4,
                background: dontShowAgain ? "rgba(150,214,205,0.12)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
              }}
            >
              {dontShowAgain && (
                <div
                  style={{
                    width: 7,
                    height: 7,
                    background: "#96d6cd",
                    borderRadius: 2,
                  }}
                />
              )}
            </div>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: "#475569",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              DON'T SHOW AGAIN
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

