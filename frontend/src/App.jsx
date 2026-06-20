// src/App.jsx
import React, { useState, useEffect } from "react";
import { Routes, Route, useParams } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import CreateToken from "./pages/CreateToken";
import TokenInfoPage from "./pages/TokenInfoPage";
import Bridge from "./pages/Bridge";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import Locking from "./pages/Locking"; // Added the new locking page register
import PublicProfile from "./components/PublicProfile";
import Welcome from "./pages/Welcome"; // Premium Welcome Onboarding Screen
import { useWallet } from "./context/WalletContext";

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

// ConnectKit theme aligned with the minimalist, high-contrast signature teal aesthetic
const ckTheme = {
  "--ck-font-family":
    "JetBrains Mono, Fira Code, Inter, ui-sans-serif, system-ui",
  "--ck-border-radius": "4px",
  "--ck-connectbutton-background": "#96d6cd",
  "--ck-connectbutton-color": "#030712",
  "--ck-connectbutton-border-radius": "4px",
  "--ck-connectbutton-font-size": "13px",
  "--ck-connectbutton-padding": "8px 16px",
  "--ck-connectbutton-hover-background": "#b2e3dc",
  "--ck-accent-color": "#96d6cd",
  "--ck-body-background": "#0b0f19",
  "--ck-body-color": "#E2E8F0",
  "--ck-body-color-muted": "#64748B",
  "--ck-body-border-radius": "4px",
  "--ck-body-padding": "24px",
  "--ck-body-action-background": "#030712",
  "--ck-body-divider": "#1e293b",
  "--ck-overlay-background": "rgba(3, 7, 18, 0.85)",
  "--ck-modal-box-shadow": "0 0 0 1px #1e293b",
};

export function CustomConnectButton({ size = "md" }) {
  const sizeMap = {
    sm: "px-3 py-1 text-xs rounded",
    md: "px-4 py-1.5 text-xs rounded",
    lg: "px-6 py-2.5 text-sm rounded",
  };
  
  const classes = `inline-flex items-center justify-center font-mono font-black uppercase tracking-wider transition-all duration-150 active:scale-[0.98] ${sizeMap[size]}`;

  return (
    <ConnectKitButton.Custom>
      {({ isConnected, show, address, ensName }) => (
        <button
          className={classes}
          onClick={() => {
            show();
          }}
          style={{
            background: ckTheme["--ck-connectbutton-background"],
            color: ckTheme["--ck-connectbutton-color"],
            borderRadius: ckTheme["--ck-connectbutton-border-radius"],
          }}
        >
          {isConnected ? (
            <span>
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
  const [showWelcome, setShowWelcome] = useState(null);

  // Synchronize state immediately upon layout lifecycle activation
  useEffect(() => {
    const skipScreen = localStorage.getItem("hideWelcomeScreen");
    if (skipScreen === "true") {
      setShowWelcome(false);
    } else {
      setShowWelcome(true);
    }
  }, []);

  // Prevent flash layout layout jumps during initialization sync loops
  if (showWelcome === null) {
    return <div className="min-h-screen bg-[#030712]" />;
  }

  // Render the dedicated gate screen without structural app templates wrapped around it
  if (showWelcome) {
    return (
      <QueryClientProvider client={queryClient}>
        <WagmiConfig config={config}>
          <ConnectKitProvider customTheme={ckTheme} mode="dark">
            <Welcome onDismiss={() => setShowWelcome(false)} />
          </ConnectKitProvider>
        </WagmiConfig>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={config}>
        <ConnectKitProvider customTheme={ckTheme} mode="dark">
          <div className="flex flex-col min-h-screen bg-[#030712]">
            <Navbar />
            
            {/* Standard main grid tracking panel spacing blocks */}
            <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-24">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/create" element={<CreateToken />} />
                <Route path="/token/:address" element={<TokenInfoPage />} />
                <Route path="/bridge" element={<Bridge />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/locking" element={<Locking />} /> {/* Real-time lock vault component link route */}
                <Route path="/user/:walletAddress" element={<WalletLoader />} />
              </Routes>
            </main>
            
          </div>
        </ConnectKitProvider>
      </WagmiConfig>
    </QueryClientProvider>
  );
}
