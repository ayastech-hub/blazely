import "./index.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider } from "connectkit";

import App from "./App";
import { WalletProvider } from "./context/WalletContext";
import { RefreshProvider } from "./context/RefreshContext";
import { config, ckTheme } from "./config/wagmi"; // Import from your new config file

const queryClient = new QueryClient();

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider customTheme={ckTheme} mode="dark">
          <WalletProvider>
            <RefreshProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </RefreshProvider>
          </WalletProvider>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
