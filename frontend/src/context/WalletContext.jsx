// src/components/WalletProvider.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { useAccount, useWalletClient, useChainId } from "wagmi";
import { base } from "wagmi/chains";
import { requestNonce, signAndLogin, getSession } from "../api/auth";

const WalletContext = createContext();

export function WalletProvider({ children }) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();

  const [isDeveloper, setIsDeveloper] = useState(false);
  const [devProfile, setDevProfile] = useState(null);
  const [session, setSession] = useState(() => getSession());

  // normalize
  const wallet = address || (session && session.wallet) || null;
  const signer = walletClient || null;

  useEffect(() => {
    if (wallet && !session) {
      // start nonce/sign/login flow
      (async () => {
        try {
          const { message } = await requestNonce(wallet);
          // signer should sign; walletClient from wagmi provides a signer-like object
          await signAndLogin(
            window.ethereum
              ? new (
                  await import("ethers")
                ).ethers.providers.Web3Provider(window.ethereum).getSigner()
              : signer,
            wallet,
            message
          );
          const s = JSON.parse(localStorage.getItem("lp_auth"));
          setSession(s);
        } catch (e) {
          console.error("Auth failed:", e);
        }
      })();
    }
  }, [wallet]);

  useEffect(() => {
    if (wallet) {
      if (wallet.toLowerCase().startsWith("0x1234")) {
        setIsDeveloper(true);
        setDevProfile({
          name: "Demo Dev",
          createdTokens: 2,
          feesEarned: "420 USDC",
        });
      } else {
        setIsDeveloper(false);
        setDevProfile(null);
      }
    }
  }, [wallet]);

  useEffect(() => {
    if (isConnected && chainId !== base.id) {
      console.warn("⚠️ Not on Base network — please switch in wallet.");
    }
  }, [isConnected, chainId]);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        signer,
        isDeveloper,
        devProfile,
        session,
        setSession,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
