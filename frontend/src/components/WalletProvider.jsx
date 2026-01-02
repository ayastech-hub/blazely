import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { useAccount, useWalletClient, useChainId } from "wagmi";
import { base } from "wagmi/chains";
import { requestNonce, signAndLogin, getSession } from "../api/auth";
import { BrowserProvider } from "ethers";
import { supabase } from "../lib/supabaseClient";

const WalletContext = createContext();

export function WalletProvider({ children }) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();

  const [session, setSession] = useState(() => getSession());

  const prevAddressRef = useRef(null);
  const initialMountRef = useRef(true);
  const upsertedAddressRef = useRef(null);

  const wallet = address || (session && session.wallet) || null;
  const signer = walletClient || null;

  async function getEthersSigner() {
    try {
      if (typeof window !== "undefined" && window.ethereum) {
        const provider = new BrowserProvider(window.ethereum);
        try {
          return await provider.getSigner();
        } catch (e) {
          console.warn("BrowserProvider.getSigner() failed:", e);
        }
      }

      if (walletClient && walletClient.transport) {
        try {
          const provider = new BrowserProvider(
            walletClient.transport,
            walletClient.chain?.id
          );
          const addr = walletClient.account?.address;
          if (addr) return await provider.getSigner(addr);
          return await provider.getSigner();
        } catch (e) {
          console.warn("BrowserProvider via walletClient.transport failed:", e);
        }
      }

      if (walletClient && typeof walletClient.signMessage === "function") {
        return {
          signMessage: async (msg) => {
            const raw = await walletClient.signMessage({
              message: String(msg),
            });
            return typeof raw === "string"
              ? raw
              : raw?.signature ??
                  raw?.sig ??
                  raw?.result ??
                  JSON.stringify(raw);
          },
          getAddress: async () => walletClient.account?.address,
        };
      }

      return null;
    } catch (err) {
      console.warn("getEthersSigner error:", err);
      return null;
    }
  }

  // ✅ Auto-create user row with just wallet address
  useEffect(() => {
    if (!address) return; // wallet not connected
    if (upsertedAddressRef.current === address) return; // already upserted

    (async () => {
      try {
        console.debug("Auto-upserting user row for wallet:", address);
        await supabase.from("users").upsert(
          {
            wallet: address.toLowerCase(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: ["wallet"] }
        );
        upsertedAddressRef.current = address;
      } catch (e) {
        console.warn("Auto-create users row failed:", e);
      }
    })();
  }, [address]);

  // Sign-in flow when user explicitly connects after initial mount
  useEffect(() => {
    if (session) {
      prevAddressRef.current = address;
      initialMountRef.current = false;
      return;
    }

    if (initialMountRef.current) {
      prevAddressRef.current = address;
      initialMountRef.current = false;
      return;
    }

    if (address && prevAddressRef.current !== address) {
      (async () => {
        try {
          const { message } = await requestNonce(address);
          const s = await getEthersSigner();

          if (!s || typeof s.signMessage !== "function") {
            if (
              walletClient &&
              typeof walletClient.signMessage === "function"
            ) {
              const wrapper = {
                signMessage: async (m) => {
                  const raw = await walletClient.signMessage({
                    message: String(m),
                  });
                  return typeof raw === "string"
                    ? raw
                    : raw?.signature ??
                        raw?.sig ??
                        raw?.result ??
                        JSON.stringify(raw);
                },
              };
              await signAndLogin(wrapper, address, message);
            } else {
              console.warn("No signer available to perform signature login");
              prevAddressRef.current = address;
              return;
            }
          } else {
            await signAndLogin(s, address, message);
          }

          const sLocal = JSON.parse(localStorage.getItem("lp_auth"));
          setSession(sLocal);
        } catch (e) {
          console.error("Auth failed:", e);
        } finally {
          prevAddressRef.current = address;
        }
      })();
    }
  }, [address, walletClient, session]);

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
