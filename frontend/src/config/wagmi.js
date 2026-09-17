import { http, createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!walletConnectProjectId) {
  // An empty/undefined WalletConnect Cloud project ID is a well-documented
  // cause of exactly the "connect modal opens and never resolves, has to
  // refresh the page" symptom — the relay never gets a valid session to
  // attach to. Fail loudly here instead of silently shipping a connector
  // that can't actually complete a WalletConnect connection.
  console.error(
    "[wagmi config] VITE_WALLETCONNECT_PROJECT_ID is not set. WalletConnect " +
    "(QR / mobile wallet) connections will hang indefinitely until this is " +
    "set to a valid project ID from https://cloud.walletconnect.com — " +
    "injected wallets (MetaMask, etc.) are unaffected."
  );
}

const sepoliaRpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

if (!import.meta.env.VITE_SEPOLIA_RPC_URL) {
  // Not fatal — publicnode.com's free Sepolia RPC works fine for
  // development — but a dedicated provider (Alchemy/Infura) is strongly
  // recommended for production: shared public RPCs rate-limit hard under
  // real traffic, and their behavior/uptime isn't something you control.
  console.warn(
    "[wagmi config] VITE_SEPOLIA_RPC_URL is not set — falling back to a public " +
    "Sepolia RPC. Set this to your own Alchemy/Infura endpoint for production."
  );
}

export const ckTheme = {
  "--ck-font-family": "JetBrains Mono, Fira Code, Inter, ui-sans-serif, system-ui",
  "--ck-border-radius": "4px",
  "--ck-connectbutton-background": "var(--teal)",
  "--ck-connectbutton-color": "var(--bg)",
  "--ck-connectbutton-border-radius": "4px",
  "--ck-connectbutton-font-size": "13px",
  "--ck-connectbutton-padding": "8px 16px",
  "--ck-connectbutton-hover-background": "var(--teal-bright)",
  "--ck-accent-color": "var(--teal)",
  "--ck-body-background": "var(--pure-black)",
  "--ck-body-color": "var(--text-bright-2)",
  "--ck-body-color-muted": "var(--text-faint-2)",
  "--ck-overlay-background": "rgba(3,7,18,0.85)",
};

export const config = createConfig({
  chains: [sepolia],
  connectors: [
    injected({ shimDisconnect: true }),
    walletConnect({ projectId: walletConnectProjectId, showQrModal: true }),
    coinbaseWallet({ appName: "Launchpad" }),
  ],
  transports: {
    [sepolia.id]: http(sepoliaRpcUrl),
  },
  ssr: false,
});
