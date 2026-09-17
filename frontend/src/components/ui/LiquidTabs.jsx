/**
 * Apple-style liquid glass tab switch.
 * Sliding frosted pill that feels like water over a dark track.
 */
import React, { useLayoutEffect, useRef, useState, useCallback } from "react";

/**
 * @param {{ id: string, label: React.ReactNode }[]} items
 * @param {string} value - active id
 * @param {(id: string) => void} onChange
 * @param {"sm"|"md"|"full"} [size]
 * @param {"default"|"buySell"} [variant] - buySell tints pill teal/rose by active id
 * @param {string} [className]
 */
export default function LiquidTabs({
  items = [],
  value,
  onChange,
  size = "md",
  variant = "default",
  className = "",
}) {
  const trackRef = useRef(null);
  const btnRefs = useRef({});
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });

  const measure = useCallback(() => {
    const btn = btnRefs.current[value];
    const track = trackRef.current;
    if (!btn || !track) return;
    const t = track.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    setPill({
      left: b.left - t.left,
      width: b.width,
      ready: true,
    });
  }, [value]);

  useLayoutEffect(() => {
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && trackRef.current) ro.observe(trackRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, items]);

  const isBuy = variant === "buySell" && value === "Buy";
  const isSell = variant === "buySell" && value === "Sell";

  const pad = size === "sm" ? "p-0.5" : size === "full" ? "p-1" : "p-1";
  const btnPad =
    size === "sm"
      ? "px-3 py-1.5 text-[11px]"
      : size === "full"
      ? "px-4 py-2.5 text-sm"
      : "px-3.5 py-2 text-xs";

  return (
    <div
      ref={trackRef}
      role="tablist"
      className={`liquid-tabs relative inline-flex items-center ${pad} rounded-full ${
        size === "full" ? "w-full" : ""
      } ${className}`}
    >
      {/* Liquid pill */}
      <div
        aria-hidden
        className={`liquid-tabs__pill absolute top-1 bottom-1 rounded-full pointer-events-none ${
          isBuy ? "liquid-tabs__pill--buy" : isSell ? "liquid-tabs__pill--sell" : ""
        }`}
        style={{
          left: pill.left,
          width: pill.width,
          opacity: pill.ready ? 1 : 0,
        }}
      />

      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => {
              btnRefs.current[item.id] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`liquid-tabs__btn relative z-10 flex-1 ${btnPad} rounded-full font-medium transition-colors duration-200 whitespace-nowrap ${
              active
                ? isBuy
                  ? "text-[var(--bg)]"
                  : isSell
                  ? "text-white"
                  : "text-[var(--text-bright)]"
                : "text-[var(--text-faint-2)] hover:text-[var(--text-mid)]"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
