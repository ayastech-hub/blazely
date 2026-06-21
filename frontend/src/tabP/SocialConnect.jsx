import React, { useState } from "react";
import { Twitter, Send, Globe, Disc, Link2, ExternalLink } from "lucide-react";

export const SocialConnect = ({ userRow, onUpdate, loading }) => {
  const [authorizing, setAuthorizing] = useState(null);

  // Enterprise Provider Window Authentication Triggers
  const triggerOAuthFlow = (provider) => {
    setAuthorizing(provider);
    
    // Calculate centered coordinate points for a clean modern pop-up panel frame
    const width = 575;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    // Use your backend route to direct straight into passport/oauth layer providers
    const apiBaseUrl = import.meta.env.VITE_API_BASE || "http://localhost:3000";
    const authUrl = `${apiBaseUrl}/api/auth/${provider}?wallet=${userRow?.wallet}`;

    const authWindow = window.open(
      authUrl,
      `${provider}-authorization-handshake`,
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
    );

    // Track active connection window and pull handle updates directly on window close events
    const monitorInterval = setInterval(async () => {
      if (!authWindow || authWindow.closed) {
        clearInterval(monitorInterval);
        setAuthorizing(null);
        // Refresh profile row down the line to pull verified username designations down from db index
        if (onUpdate) onUpdate({});
      }
    }, 1000);
  };

  const channels = [
    { key: "twitter", label: "Twitter / X", icon: Twitter },
    { key: "telegram", label: "Telegram Auth", icon: Send },
    { key: "farcaster", label: "Farcaster ID", icon: Disc },
  ];

  return (
    <div className="mt-4 p-4 bg-[#070a13] border border-slate-900 rounded-lg space-y-3 max-w-xl font-mono">
      <div className="flex items-center justify-between border-b border-slate-900 pb-2">
        <div className="flex items-center gap-1.5">
          <Link2 size={12} className="text-[#96d6cd]" />
          <span className="text-[10px] font-bold text-slate-200 tracking-wider uppercase">ENTERPRISE_IDENTITY_LINK</span>
        </div>
        <span className="text-[9px] text-slate-500 font-bold">PROTOCOL: OAUTH_2.0</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {channels.map((chan) => {
          const verifiedHandle = userRow?.[chan.key];
          const isCurrentAuth = authorizing === chan.key;

          return (
            <div 
              key={chan.key} 
              className={`flex flex-col justify-between p-3 rounded border transition-all ${
                verifiedHandle 
                  ? "bg-[#0b1324] border-slate-800" 
                  : "bg-[#030712] border-dashed border-slate-900"
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <chan.icon size={14} className={verifiedHandle ? "text-[#96d6cd]" : "text-slate-500"} />
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">{chan.label}</span>
              </div>

              {verifiedHandle ? (
                <div className="space-y-2">
                  <span className="text-[10px] text-[#96d6cd] bg-[#96d6cd]/5 border border-[#96d6cd]/10 px-1.5 py-0.5 rounded block truncate font-bold">
                    @{verifiedHandle}
                  </span>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => onUpdate({ [chan.key]: null })}
                    className="w-full text-[9px] font-bold py-1 bg-slate-900 hover:bg-rose-950/30 text-slate-500 hover:text-rose-400 border border-slate-850 rounded transition-all uppercase"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={loading || isCurrentAuth}
                  onClick={() => triggerOAuthFlow(chan.key)}
                  className="w-full text-[9px] font-bold py-1.5 bg-[#0b1324] hover:bg-[#111c35] text-[#96d6cd] border border-slate-800 rounded transition-all flex items-center justify-center gap-1 uppercase"
                >
                  {isCurrentAuth ? "Connecting..." : "Authorize"}
                  <ExternalLink size={8} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
