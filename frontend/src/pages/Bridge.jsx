// src/pages/Bridge.jsx
import React, { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

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
          "eyJhcHBCYWNrZ3JvdW5kIjoiIzAyMDYxNyIsInByaW1hcnkiOiIjZDk5ZTMxIiwicHJpbWFyeUJ0bkJnIjoicmdiYSgxMjQsNjgsMjIyLDAuODEpIiwicHJpbWFyeUJ0blRleHQiOiIjYzdkM2RjIiwiZm9ybUhlYWRCdG5TaXplIjoiNjAifQ==",
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
    <div className="font-mono min-h-screen bg-[#030712] text-slate-300 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#030712] z-10 transition-opacity duration-300">
          <RefreshCw size={18} className="text-[#96d6cd] animate-spin mb-2" />
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">INITIALIZING_BRIDGE_STREAM</span>
        </div>
      )}

      <div
        id="debridgeWidget"
        className={`w-full max-w-3xl h-[800px] rounded-none border border-slate-900 bg-[#0b0f19]/40 transition-opacity duration-300 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
      ></div>
    </div>
  );
}
