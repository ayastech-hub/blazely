// src/components/Logo.jsx
import React from "react";

export default function Logo({ size = 32, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none ${className}`}
    >
      <defs>
        <linearGradient id="blazelyTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#96d6cd" />
          <stop offset="50%" stopColor="#64b3a8" />
          <stop offset="100%" stopColor="#0d121f" />
        </linearGradient>
        <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <polygon
        points="50,5 90,28 90,72 50,95 10,72 10,28"
        className="stroke-slate-900"
        strokeWidth="1.5"
        fill="#0d121f"
        fillOpacity="0.2"
      />
      <polygon
        points="50,12 84,31 84,69 50,88 16,69 16,31"
        className="stroke-slate-800/60"
        strokeWidth="1"
        fill="none"
      />
      <path
        d="M38 25 H58 C66 25, 68 33, 58 39 C68 43, 66 53, 54 53 H42 L30 75 L44 47 H36 L52 25"
        fill="url(#blazelyTealGrad)"
        filter="url(#neonGlow)"
        stroke="#96d6cd"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      <polygon points="46,47 54,47 40,75" fill="#030712" />
    </svg>
  );
}
