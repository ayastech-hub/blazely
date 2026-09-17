// src/components/WalletAuthBanner.jsx
import React from "react";
import { PenLine, AlertTriangle } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import Alert from "./ui/Alert";

export default function WalletAuthBanner() {
  const { authStatus, authError, retrySignIn } = useWallet();

  if (authStatus === "signing") {
    return (
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4">
        <Alert variant="info">
          <div className="flex items-center gap-2">
            <PenLine size={14} className="shrink-0" />
            <span>Check your wallet — sign the message to finish connecting. This costs no gas.</span>
          </div>
        </Alert>
      </div>
    );
  }

  if (authStatus === "error") {
    return (
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4">
        <Alert variant="error" title="Sign-in failed">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <AlertTriangle size={13} className="shrink-0" />
              {authError || "Please try again."}
            </span>
            <button
              onClick={retrySignIn}
              className="shrink-0 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase border border-current"
            >
              Retry
            </button>
          </div>
        </Alert>
      </div>
    );
  }

  return null;
}
