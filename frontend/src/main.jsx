// main.jsx
import "./index.css";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

import { BrowserRouter } from "react-router-dom";
import { WalletProvider } from "./context/WalletContext";
import { RefreshProvider } from "./context/RefreshContext";

import { WagmiProvider, createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains"; // ✅ changed to Sepolia
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ✅ setup query client
const queryClient = new QueryClient();

// ✅ wagmi config (Sepolia chain)
const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http("https://eth-sepolia.g.alchemy.com/v2/gTZNVB90WEFl6tc17CotK"),
    // or: http("https://rpc.sepolia.org")
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
