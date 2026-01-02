import React from "react";
import { Routes, Route, useParams } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import CreateToken from "./pages/CreateToken";
import { useWallet } from "./context/WalletContext";

import TokenInfoPage from "./pages/TokenInfoPage";
import Bridge from "./pages/Bridge";
import Leaderboard from "./pages/Leaderboard";
import PublicProfile from "./components/PublicProfile";

import Profile from "./pages/Profile";

import { WagmiConfig, createConfig } from "wagmi";
import {
  ConnectKitProvider,
  getDefaultConfig,
  ConnectKitButton,
} from "connectkit";
import { sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// Configure for Sepolia
const config = createConfig(
  getDefaultConfig({
    appName: "Launchpad",
    walletConnectProjectId,
    chains: [sepolia],
  })
);

// ConnectKit custom theme
const ckTheme = {
  "--ck-font-family":
    "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue'",
  "--ck-border-radius": "12px",
  "--ck-connectbutton-background": "linear-gradient(90deg, #7c3aed, #06b6d4)",
  "--ck-connectbutton-color": "#ffffff",
  "--ck-connectbutton-border-radius": "12px",
  "--ck-connectbutton-font-size": "16px",
  "--ck-connectbutton-padding": "10px 20px",
  "--ck-connectbutton-hover-background":
    "linear-gradient(90deg, #8b5cf6, #22d3ee)",
  "--ck-accent-color": "#06b6d4",
  "--ck-body-background": "#04091A",
  "--ck-body-color": "#F1F5F9",
  "--ck-body-color-muted": "#94A3B8",
  "--ck-body-border-radius": "12px",
  "--ck-body-padding": "24px",
  "--ck-body-action-background": "#1E293B",
  "--ck-body-divider": "#334155",
  "--ck-overlay-background": "rgba(0, 0, 0, 0.7)",
  "--ck-modal-box-shadow": "0 8px 32px 0 rgba(0, 0, 0, 0.5)",
};
export function CustomConnectButton({ size = "md" }) {
  const sizeMap = {
    sm: "px-3 py-1.5 text-sm rounded-md",
    md: "px-4 py-2 text-base rounded-lg",
    lg: "px-6 py-3 text-lg rounded-2xl",
  };
  const classes = `inline-flex items-center justify-center font-semibold text-white shadow-lg transition-opacity duration-150 ${sizeMap[size]}`;

  return (
    <ConnectKitButton.Custom>
      {({ isConnected, show, address, ensName }) => (
        <button
          className={classes}
          onClick={() => {
            // Always open modal if not connected
            show();
          }}
          style={{
            background: ckTheme["--ck-connectbutton-background"],
            color: ckTheme["--ck-connectbutton-color"],
            borderRadius: ckTheme["--ck-connectbutton-border-radius"],
            fontSize: ckTheme["--ck-connectbutton-font-size"],
          }}
        >
          {isConnected ? (
            <span className="font-mono">
              {ensName || `${address.slice(0, 6)}...${address.slice(-4)}`}
            </span>
          ) : (
            <span>Connect Wallet</span>
          )}
        </button>
      )}
    </ConnectKitButton.Custom>
  );
}

// Small route wrapper that passes the :walletAddress param into PublicProfile
function WalletLoader() {
  const { walletAddress } = useParams();
  return <PublicProfile walletAddress={walletAddress} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={config}>
        <ConnectKitProvider customTheme={ckTheme} mode="dark">
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 lg:pt-15 pb-24">
              <div className="space-y-8">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/create" element={<CreateToken />} />
                  <Route path="/token/:address" element={<TokenInfoPage />} />
                  <Route path="/bridge" element={<Bridge />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route
                    path="/user/:walletAddress"
                    element={<WalletLoader />}
                  />
                </Routes>
              </div>
            </main>
          </div>
        </ConnectKitProvider>
      </WagmiConfig>
    </QueryClientProvider>
  );
}
