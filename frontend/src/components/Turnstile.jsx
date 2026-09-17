// src/components/Turnstile.jsx
//
// Cloudflare Turnstile — free, invisible-in-most-cases bot challenge.
// Docs: https://developers.cloudflare.com/turnstile/
//
// This produces a short-lived verification token. That token gets passed
// to Supabase's Auth token endpoint (see src/lib/siweAuth.js), which
// verifies it server-side against Cloudflare before completing sign-in —
// this requires "Enable CAPTCHA protection" to be turned on in the
// Supabase Dashboard (Authentication > Attack Protection) with the
// matching Turnstile SECRET key. See supabase/README.md for the full
// setup. Without that dashboard step, Supabase ignores the token
// entirely — this component alone does not enforce anything.
import React, { useEffect, useRef, useState } from "react";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

let scriptLoadPromise = null;
function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Failed to load Turnstile script"));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

/**
 * Renders an invisible Turnstile challenge and calls onVerify(token) once
 * the visitor passes. Turnstile decides on its own whether that requires
 * any visible interaction — most legitimate users see nothing at all.
 */
export default function Turnstile({ onVerify, onError, action = "signin" }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!SITE_KEY) {
      console.warn("[Turnstile] VITE_TURNSTILE_SITE_KEY is not set — bot protection is disabled.");
      setFailed(true);
      return;
    }

    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          action,
          callback: (token) => onVerify?.(token),
          "error-callback": () => {
            setFailed(true);
            onError?.(new Error("Turnstile challenge failed."));
          },
          size: "invisible",
        });
      })
      .catch((err) => {
        setFailed(true);
        onError?.(err);
      });

    return () => {
      if (widgetIdRef.current != null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
      cancelled = true;
    };
  }, [action, onVerify, onError]);

  if (failed) return null; // fail open on the widget itself — Supabase-side verification is the real gate
  return <div ref={containerRef} />;
}
