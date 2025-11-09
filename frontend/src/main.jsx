// main.jsx
import "./index.css";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

import { BrowserRouter } from "react-router-dom";
import { WalletProvider } from "./context/WalletContext";
import { RefreshProvider } from "./context/RefreshContext";

import { WagmiProvider, createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ✅ setup query client
const queryClient = new QueryClient();

// ✅ wagmi config (Base chain only, add others if needed)
const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http("https://mainnet.base.org"),
  },
});

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>
          <RefreshProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </RefreshProvider>
        </WalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
