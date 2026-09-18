import React, { useState, useEffect } from "react";
import { Routes, Route, useParams } from "react-router-dom";
import { ConnectKitProvider, ConnectKitButton } from "connectkit";

import Navbar from "./components/Navbar";
import WalletAuthBanner from "./components/WalletAuthBanner";
import Home from "./pages/Home";
import CreateToken from "./pages/CreateToken";
import TokenInfoPage from "./pages/TokenInfoPage";
import Bridge from "./pages/Bridge";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import Locking from "./pages/Locking";
import Bounty from "./pages/Bounty";
import PublicProfile from "./pages/PublicProfile";
import Welcome from "./pages/Welcome";
import BackgroundGlow from "./components/BackgroundGlow";
import { MaintenanceGuard } from "./components/MaintenanceGuard";

// Note: You must import your theme variable here or define it locally 
// if it is not exported from a separate config file.
import { ckTheme } from "./config/wagmi"; 

export function CustomConnectButton({ size = "md" }) {
  const sizes = {
    sm: "px-3 py-1 text-xs rounded",
    md: "px-4 py-1.5 text-xs rounded",
    lg: "px-6 py-2.5 text-sm rounded",
  };

  const classes = `inline-flex items-center justify-center font-mono font-black uppercase tracking-wider transition-all duration-150 active:scale-[0.98] ${sizes[size]}`;

  return (
    <ConnectKitButton.Custom>
      {({ isConnected, show, address, ensName }) => (
        <button
          className={classes}
          onClick={show}
          style={{
            background: ckTheme["--ck-connectbutton-background"],
            color: ckTheme["--ck-connectbutton-color"],
            borderRadius: ckTheme["--ck-connectbutton-border-radius"],
          }}
        >
          {isConnected ? (ensName || `${address.slice(0, 6)}...${address.slice(-4)}`) : ("Connect Wallet")}
        </button>
      )}
    </ConnectKitButton.Custom>
  );
}

function WalletLoader() {
  const { walletAddress } = useParams();
  return <PublicProfile walletAddress={walletAddress} />;
}

export default function App() {
  const [showWelcome, setShowWelcome] = useState(null);

  useEffect(() => {
    const skip = localStorage.getItem("hideWelcomeScreen");
    setShowWelcome(skip === "true" ? false : true);
  }, []);

  return (
    <MaintenanceGuard>
      <div className="flex flex-col min-h-screen">
        {/* Rendered once, here, for the whole app — not per-page. Previously
            only Home.jsx included this, which is why Home looked lighter/
            different from every other page, and why glass surfaces (backdrop-
            blur cards) elsewhere rendered as flat hazy gray boxes instead of
            actual glass — they need this dynamic color behind them to work. */}
        <BackgroundGlow />
        <Navbar />
        <WalletAuthBanner />
        <main className="flex-1 w-full max-w-[1600px] mx-auto px-2 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-24">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateToken />} />
            <Route path="/token/:address" element={<TokenInfoPage />} />
            <Route path="/bridge" element={<Bridge />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/locking" element={<Locking />} />
            <Route path="/bounty" element={<Bounty />} />
            <Route path="/user/:walletAddress" element={<WalletLoader />} />
          </Routes>
        </main>
        {/* Rendered as an overlay on top of the shell — not a full-page swap —
            so the navbar (blurred behind it) stays visible instead of
            disappearing entirely while the welcome screen is up. */}
        {showWelcome && <Welcome onDismiss={() => setShowWelcome(false)} />}
      </div>
    </MaintenanceGuard>
  );
}
