import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import CreateToken from "./pages/CreateToken";

import TokenDetail from "./pages/TokenDetail";
import Bridge from "./pages/Bridge";
import Leaderboard from "./pages/Leaderboard";

import Profile from "./pages/Profile";

import { WagmiConfig, createConfig } from "wagmi";
import {
  ConnectKitProvider,
  getDefaultConfig,
  ConnectKitButton,
} from "connectkit";
import { base, baseSepolia } from "wagmi/chains"; // ✅ Use Base

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ✅ create QueryClient instance
const queryClient = new QueryClient();

// WalletConnect Project ID
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// ✅ Configure for Base
const config = createConfig(
  getDefaultConfig({
    appName: "Launchpad",
    walletConnectProjectId,
    chains: [base, baseSepolia], // ✅ Base mainnet + Base Sepolia (testnet)
  })
);

// --- Custom ConnectKit theme (adjust sizes/colors here) ---
const ckTheme = {
  // Basic visual tokens
  "--ck-font-family":
    "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue'",
  "--ck-border-radius": "12px",

  // Connect button defaults (you can override per size by wrapping/custom button)
  "--ck-connectbutton-background": "linear-gradient(90deg, #7c3aed, #06b6d4)",
  "--ck-connectbutton-color": "#ffffff",
  "--ck-connectbutton-border-radius": "12px",
  "--ck-connectbutton-font-size": "16px",
  "--ck-connectbutton-padding": "10px 20px",
  "--ck-connectbutton-hover-background":
    "linear-gradient(90deg, #8b5cf6, #22d3ee)",

  // Modal / badge accents (optional)
  "--ck-accent-color": "#06b6d4",
};

// Small helper: custom Connect button that lets you choose size variants
export function CustomConnectButton({ size = "md" }) {
  // Tailwind-like size mapping (you can tweak classes)
  const sizeMap = {
    sm: "px-3 py-1.5 text-sm rounded-md",
    md: "px-4 py-2 text-base rounded-lg",
    lg: "px-6 py-3 text-lg rounded-2xl",
  };

  const classes = `inline-flex items-center justify-center font-semibold text-white shadow-lg transition-opacity duration-150 ${sizeMap[size]}`;

  // We still use ConnectKit's internals for connection flow but render our own button UI
  return (
    <ConnectKitButton.Custom>
      {({ isConnected, show, address, ensName }) => (
        <button
          onClick={show}
          className={classes}
          style={{
            background: ckTheme["--ck-connectbutton-background"],
            color: ckTheme["--ck-connectbutton-color"],
            borderRadius: ckTheme["--ck-connectbutton-border-radius"],
            fontSize: ckTheme["--ck-connectbutton-font-size"],
            padding: undefined, // we control padding via classes above per size
          }}
        >
          {isConnected ? (
            <span className="font-mono">
              {ensName ||
                (address
                  ? `${address.slice(0, 6)}...${address.slice(-4)}`
                  : "Connected")}
            </span>
          ) : (
            <span>Connect Wallet</span>
          )}
        </button>
      )}
    </ConnectKitButton.Custom>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={config}>
        <ConnectKitProvider theme="midnight" customTheme={ckTheme} mode="dark">
          <div className="flex flex-col min-h-screen">
            {/* NOTE: replace Navbar's built-in Connect button with <CustomConnectButton size="lg" /> if you want the large variant there. */}
            <Navbar />

            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="space-y-8">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/create" element={<CreateToken />} />

                  <Route path="/token/:address" element={<TokenDetail />} />

                  <Route path="/bridge" element={<Bridge />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />

                  <Route path="/profile" element={<Profile />} />
                </Routes>
              </div>
            </main>

            {/* Background animation */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-purple-400 rounded-full animate-ping"></div>
              <div className="absolute bottom-1/3 left-1/2 w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse"></div>
              <div
                className="absolute top-1/2 right-1/4 w-1 h-1 bg-cyan-300 rounded-full animate-ping"
                style={{ animationDelay: "1s" }}
              ></div>
            </div>
          </div>
        </ConnectKitProvider>
      </WagmiConfig>
    </QueryClientProvider>
  );
}
