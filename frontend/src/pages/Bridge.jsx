// src/pages/Bridge.jsx
import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function Bridge() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const WIDGET_ID = "debridgeWidget";
    const SCRIPT_ID = "debridge-widget-script";
    const INIT_FLAG = "__debridge_widget_initialized";

    const initWidget = () => {
      if (window[INIT_FLAG]) return; // prevent duplicate init
      if (!window.deBridge || typeof window.deBridge.widget !== "function")
        return;

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
          "eyJhcHBCYWNrZ3JvdW5kIjoiIzAyMDYxNyIsInByaW1hcnkiOiIjZDk5ZTMxIiwicHJpbWFyeUJ0bkJnIjoicmdiYSgxMjQsNjgsMjIyLDAuODEpIiwicHJpbWFyeUJ0blRleHQiOiIjYzdkM2RjIiwiZm9ybUhlYWRCdG5TaXplIjoiNjAifQ==",
        theme: "dark",
        isHideLogo: false,
        logo: "",
        disabledWallets: [],
        disabledElements: [],
      });

      // Mark as initialized & remove loader after a small delay
      window[INIT_FLAG] = true;
      setTimeout(() => setIsLoading(false), 800);
    };

    // Load widget script (only once)
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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-10 transition-opacity duration-500">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-3" />
          <p className="text-slate-400 text-sm">Loading Bridge...</p>
        </div>
      )}

      <div
        id="debridgeWidget"
        className={`w-full max-w-3xl h-[800px] rounded-2xl shadow-xl border border-slate-800 bg-slate-900/50 transition-opacity duration-700 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
      ></div>
    </div>
  );
}
