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
      className={className}
    >
      {/* 
        Core "B" + Lightning Mark 
        - Removed fill to make the inside completely blank/transparent
        - Increased strokeWidth slightly to make the outline crisp and defined
      */}
      <path
        d="M38 25 H58 C66 25, 68 33, 58 39 C68 43, 66 53, 54 53 H42 L30 75 L44 47 H36 L52 25"
        stroke="#96d6cd"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      
      {/* 
        The Shadow Accent Bolt 
        - Colored to match a sleek semi-transparent dark shade that blends with the app background
      */}
      <polygon 
        points="46,47 54,47 41,73" 
        fill="#111827" 
        fillOpacity="0.4" 
      />
    </svg>
  );
}
