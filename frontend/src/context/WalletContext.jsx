import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { useAccount, useWalletClient, useChainId, useSignMessage } from "wagmi";
import { sepolia } from "wagmi/chains";
import { supabase } from "../lib/supabaseClient";
import { signInWithWallet, signOutWallet, getAuthenticatedWallet } from "../lib/siweAuth";
import { getTurnstileToken } from "../lib/turnstile";
import { BrowserProvider } from "ethers";

const WalletContext = createContext();

export function WalletProvider({ children }) {
  const { address, isConnected, status } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();

  const [wallet, setWallet] = useState(null);
  const [signer, setSigner] = useState(null);
  const [authStatus, setAuthStatus] = useState("idle"); // idle | signing | authenticated | error
  const [authError, setAuthError] = useState(null);
  const signedInAddressRef = useRef(null);

  // Keep wallet in sync with wagmi connection
  useEffect(() => {
    setWallet(isConnected && address ? address.toLowerCase() : null);
  }, [address, isConnected]);

  // Generate ethers signer.
  //
  // BUG FIX: this used to call `new BrowserProvider(window.ethereum).getSigner()`
  // unconditionally whenever `window.ethereum` existed — even before the wallet
  // was connected, and even when the user connected via WalletConnect/Coinbase
  // rather than an injected wallet. `getSigner()` on an unauthorized provider
  // silently triggers its own `eth_requestAccounts` prompt, which raced against
  // ConnectKit's own connect modal — that's what caused the connect modal to
  // reopen/hang and need a page refresh. Fixed: don't touch any provider until
  // wagmi reports an actual connection, and prefer `walletClient` (the connector
  // wagmi/ConnectKit actually connected through) over reaching for
  // `window.ethereum` directly.
  useEffect(() => {
    if (!isConnected || !address) {
      setSigner(null);
      return;
    }

    let cancelled = false;

    const getEthersSigner = async () => {
      try {
        if (typeof window === "undefined") return null;

        // Prefer the connector wagmi/ConnectKit actually connected through —
        // correct for WalletConnect, Coinbase Wallet, and injected alike.
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

        // Fallback: only reach for the injected provider once we know the
        // wallet is connected (guarded above), never speculatively.
        if (window.ethereum) {
          const provider = new BrowserProvider(window.ethereum);
          return await provider.getSigner();
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

    getEthersSigner().then((s) => {
      if (!cancelled) setSigner(s);
    });

    return () => {
      cancelled = true;
    };
  }, [walletClient, isConnected, address]);

  // Sign in with Ethereum (SIWE) — replaces the previous insecure pattern of
  // treating "wagmi reports this address as connected" as proof of identity.
  // See supabase/README.md and src/lib/siweAuth.js for the full explanation.
  // This prompts a signature once per new address per session; the resulting
  // Supabase session is what every RLS policy actually checks against, not
  // whatever `wallet` value happens to be in this React state.
  useEffect(() => {
    if (!isConnected || !address || !chainId) {
      signedInAddressRef.current = null;
      setAuthStatus("idle");
      setAuthError(null);
      return;
    }
    if (signedInAddressRef.current === address) return; // already signed in this session

    let cancelled = false;

    (async () => {
      setAuthStatus("signing");
      setAuthError(null);
      try {
        // If a valid session for this exact address already exists (e.g. a
        // page refresh restored it from storage), don't re-prompt a signature.
        const existing = await getAuthenticatedWallet();
        if (existing === address.toLowerCase()) {
          if (!cancelled) {
            signedInAddressRef.current = address;
            setAuthStatus("authenticated");
          }
          return;
        }

        const captchaToken = await getTurnstileToken();
        await signInWithWallet({ address, chainId, signMessageAsync, captchaToken });

        // Keep the public profile row in sync — now happening only as a
        // side effect of a verified sign-in, gated by RLS's insert/update
        // policy which requires wallet_address to match the signed-in JWT.
        await supabase.from("users").upsert(
          { wallet: address.toLowerCase(), updated_at: new Date().toISOString() },
          { onConflict: "wallet" }
        );

        if (!cancelled) {
          signedInAddressRef.current = address;
          setAuthStatus("authenticated");
        }
      } catch (err) {
        console.warn("Wallet sign-in failed:", err);
        if (!cancelled) {
          setAuthStatus("error");
          setAuthError(err?.message || "Sign-in failed. Please try again.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, isConnected, chainId, signMessageAsync]);

  // Sign out of Supabase once the wallet is confirmed disconnected — NOT
  // on every falsy `isConnected`. wagmi's `status` goes through
  // 'connecting'/'reconnecting' on every page load while it silently
  // restores a previous connection from storage, and `isConnected` is
  // false for that entire window. Signing out on that transient state
  // (as this used to) destroyed the just-persisted Supabase session
  // before it could ever be reused — that was the actual cause of being
  // asked to sign in on every visit, not anything about the auth design.
  // `status === 'disconnected'` is wagmi's definitive terminal state:
  // either there was never a connection, or the user explicitly disconnected.
  useEffect(() => {
    if (status === "disconnected") {
      signOutWallet();
    }
  }, [status]);

  // Network warning
  useEffect(() => {
    if (isConnected && chainId !== sepolia.id) {
      console.warn("⚠️ Not on sepolia network — please switch in wallet.");
    }
  }, [isConnected, chainId]);

  const retrySignIn = () => {
    signedInAddressRef.current = null;
    setAuthStatus("idle");
    setAuthError(null);
  };

  return (
    <WalletContext.Provider
      value={{
        wallet,
        signer,
        isConnected,
        isAuthenticated: authStatus === "authenticated",
        authStatus,
        authError,
        retrySignIn,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
