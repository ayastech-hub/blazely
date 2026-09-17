// src/lib/turnstile.js
//
// Promise-based wrapper around Cloudflare Turnstile for imperative call
// sites (like the SIWE sign-in flow in WalletContext.jsx), where waiting on
// a rendered component's onVerify callback would be awkward. Uses
// Turnstile's documented explicit-render + execute() pattern:
// https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/#execution-modes
//
// A single hidden widget is rendered once (lazily, on first use) and
// reused — turnstile.execute() requests a fresh token from the same
// widget each time, which is the documented way to get more than one
// token without re-rendering.

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

let scriptLoadPromise = null;
let widgetId = null;
let widgetContainer = null;

function loadScript() {
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

function ensureWidget() {
  if (widgetId != null) return widgetId;
  widgetContainer = document.createElement("div");
  widgetContainer.style.display = "none";
  document.body.appendChild(widgetContainer);
  widgetId = window.turnstile.render(widgetContainer, {
    sitekey: SITE_KEY,
    size: "invisible",
    execution: "execute", // don't auto-run — only verify when we explicitly ask
    callback: () => {}, // real handling happens via the promise in getTurnstileToken()
  });
  return widgetId;
}

/**
 * Resolves with a fresh Turnstile verification token, or null if Turnstile
 * isn't configured (VITE_TURNSTILE_SITE_KEY unset) — callers should treat
 * null as "bot protection unavailable" and decide whether to proceed
 * (fail open) or block (fail closed) for their specific action.
 */
export async function getTurnstileToken({ timeoutMs = 10000 } = {}) {
  if (!SITE_KEY) {
    console.warn("[Turnstile] VITE_TURNSTILE_SITE_KEY is not set — skipping bot challenge.");
    return null;
  }

  await loadScript();
  const id = ensureWidget();

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn("[Turnstile] Timed out waiting for a token.");
      resolve(null);
    }, timeoutMs);

    window.turnstile.execute(id, {
      callback: (token) => {
        clearTimeout(timeout);
        resolve(token);
      },
      "error-callback": () => {
        clearTimeout(timeout);
        console.warn("[Turnstile] Challenge failed.");
        resolve(null);
      },
    });
  });
}
