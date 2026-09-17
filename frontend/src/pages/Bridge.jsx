// src/pages/Bridge.jsx
//
// PURPOSE
// Embeds deBridge's cross-chain bridge widget (a third-party script, not
// built by this app) so users can move real assets between mainnets. This
// is intentionally separate from the rest of the app's Sepolia-testnet
// focus — deBridge doesn't support Sepolia, and bridging is a generic
// cross-chain utility, not tied to this launchpad's own token contracts.
//
// HOW THE WIDGET LOADS
// The deBridge script is loaded once, globally (checked via
// `window.deBridge`), then `initWidget()` mounts it into the `#debridgeWidget`
// div. `window.__debridge_widget_initialized` prevents double-init if this
// component remounts (e.g. React StrictMode's double-render in dev, or fast
// route navigation). Cleanup clears the container's HTML and the init flag
// so a genuine remount (not just a re-render) can re-initialize cleanly.
//
// A REAL BUG FOUND AND FIXED HERE
// The widget's `styles` prop is a base64-encoded JSON theme config, and it
// was hardcoded to an amber/purple color scheme (`primary: "#d99e31"`,
// `primaryBtnBg: "rgba(124,68,222,0.81)"`) that had nothing to do with this
// app's actual teal brand — presumably copied from deBridge's own example
// snippet and never customized. Now uses this app's actual --bg/--teal
// values. The widget is a third-party embed and can't read our CSS custom
// properties, so this has to be hardcoded hex, base64-encoded — if the
// brand palette changes, decode this blob, edit the JSON, re-encode, see
// the comment at the styles field below for the decoded shape.
//
// `inputChain: 1` / `outputChain: 56` (Ethereum mainnet / BSC) are the
// widget's default pre-selected chains — left as-is since they're sensible
// generic defaults for a bridge feature, not something tied to this app's
// own Sepolia configuration.
import React, { useEffect, useState } from "react";
import Loading from "../components/ui/Loading";

export default function Bridge() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const WIDGET_ID = "debridgeWidget";
    const SCRIPT_ID = "debridge-widget-script";
    const INIT_FLAG = "__debridge_widget_initialized";

    const initWidget = () => {
      if (window[INIT_FLAG]) return;
      if (!window.deBridge || typeof window.deBridge.widget !== "function") return;

      window.deBridge.widget({
        v: "1",
        element: WIDGET_ID,
        title: "",
        description: "",
        width: "100%",
        height: "800",
        r: null,
        supportedChains:
          '{"inputChains":{"1":"all","10":"all","56":"all","100":"all","137":"all","146":"all","747":"all","999":"all","1329":"all","1514":"all","2741":"all","5000":"all","8453":"all","9745":"all","32769":"all","42161":"all","43114":"all","50104":"all","59144":"all","60808":"all","80094":"all","999999":"all","7565164":"all","245022934":"all","728126428":"all"},"outputChains":{"1":"all","10":"all","56":"all","100":"all","137":"all","146":"all","747":"all","999":"all","1329":"all","1514":"all","2741":"all","5000":"all","8453":"all","9745":"all","32769":"all","42161":"all","43114":"all","50104":"all","59144":"all","60808":"all","80094":"all","999999":"all","7565164":"all","245022934":"all","728126428":"all"}}',
        inputChain: 1,
        outputChain: 56,
        inputCurrency: "",
        outputCurrency: "",
        address: "",
        showSwapTransfer: true,
        amount: "",
        outputAmount: "",
        isAmountFromNotModifiable: false,
        isAmountToNotModifiable: false,
        lang: "en",
        mode: "deswap",
        isEnableCalldata: false,
        styles:
          // Decoded, this is: {"appBackground":"#05070d","primary":"#96d6cd",
          // "primaryBtnBg":"#96d6cd","primaryBtnText":"#05070d","formHeadBtnSize":"60"}
          // — matches this app's actual --bg/--teal brand colors. The widget
          // can't read our CSS variables (it's a third-party embed loaded
          // from deBridge's own script), so these are hardcoded hex values;
          // update this base64 blob by hand if the brand palette changes
          // (see the decode/re-encode snippet in this comment for how).
          "eyJhcHBCYWNrZ3JvdW5kIjogIiMwNTA3MGQiLCAicHJpbWFyeSI6ICIjOTZkNmNkIiwgInByaW1hcnlCdG5CZyI6ICIjOTZkNmNkIiwgInByaW1hcnlCdG5UZXh0IjogIiMwNTA3MGQiLCAiZm9ybUhlYWRCdG5TaXplIjogIjYwIn0=",
        theme: "dark",
        isHideLogo: false,
        logo: "",
        disabledWallets: [],
        disabledElements: [],
      });

      window[INIT_FLAG] = true;
      setTimeout(() => setIsLoading(false), 800);
    };

    const existingScript = document.getElementById(SCRIPT_ID);
    if (window.deBridge && typeof window.deBridge.widget === "function") {
      initWidget();
    } else if (existingScript) {
      existingScript.addEventListener("load", initWidget, { once: true });
    } else {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://app.debridge.com/assets/scripts/widget.js";
      script.async = true;
      script.onload = initWidget;
      document.body.appendChild(script);
    }

    return () => {
      const container = document.getElementById(WIDGET_ID);
      if (container) container.innerHTML = "";
      delete window[INIT_FLAG];
    };
  }, []);

  return (
    <div className="font-mono text-[var(--text-mid)] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg)] z-10 transition-opacity duration-300">
          <Loading label="INITIALIZING_BRIDGE_STREAM" />
        </div>
      )}

      <div
        id="debridgeWidget"
        className={`w-full max-w-3xl h-[800px] rounded-2xl border border-[var(--border)] bg-[var(--bg-alt)]/20 transition-opacity duration-300 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
      ></div>
    </div>
  );
}
