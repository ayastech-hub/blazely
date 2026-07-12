import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { useAccount, useWalletClient, useChainId } from "wagmi";
import { sepolia } from "wagmi/chains";
import { supabase } from "../lib/supabaseClient";
import { BrowserProvider } from "ethers";

const WalletContext = createContext();

export function WalletProvider({ children }) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();

  const [wallet, setWallet] = useState(null);
  const [signer, setSigner] = useState(null);
  const upsertedAddressRef = useRef(null);

  // Keep wallet in sync with wagmi connection
  useEffect(() => {
    setWallet(isConnected && address ? address.toLowerCase() : null);
  }, [address, isConnected]);

  // Generate ethers signer
  useEffect(() => {
    const getEthersSigner = async () => {
      try {
        if (typeof window === "undefined") return null;

        // MetaMask / injected provider
        if (window.ethereum) {
          const provider = new BrowserProvider(window.ethereum);
          return await provider.getSigner();
        }

        // WalletConnect or wagmi walletClient
        if (walletClient && walletClient.transport) {
          const provider = new BrowserProvider(
            walletClient.transport,
            walletClient.chain?.id
          );
          const addr = walletClient.account?.address;
          return addr
            ? await provider.getSigner(addr)
            : await provider.getSigner();
        }

        // Fallback signer for custom wallets
        if (walletClient && typeof walletClient.signMessage === "function") {
          return {
            signMessage: async (msg) => {
              const raw = await walletClient.signMessage({
                message: String(msg),
              });
              return typeof raw === "string"
                ? raw
                : (raw?.signature ?? JSON.stringify(raw));
            },
            getAddress: async () => walletClient.account?.address ?? null,
          };
        }

        return null;
      } catch (err) {
        console.warn("getEthersSigner error:", err);
        return null;
      }
    };

    getEthersSigner().then(setSigner);
  }, [walletClient]);

  // Auto-create / upsert user row
  useEffect(() => {
    if (!isConnected || !address) return; // wallet not connected
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
  }, [address, isConnected]);

  // Network warning
  useEffect(() => {
    if (isConnected && chainId !== base.id) {
      console.warn("⚠️ Not on sepolia network — please switch in wallet.");
    }
  }, [isConnected, chainId]);

  return (
    <WalletContext.Provider value={{ wallet, signer, isConnected }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
