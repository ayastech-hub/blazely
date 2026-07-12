import { http, createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

export const ckTheme = {
  "--ck-font-family": "JetBrains Mono, Fira Code, Inter, ui-sans-serif, system-ui",
  "--ck-border-radius": "4px",
  "--ck-connectbutton-background": "#96d6cd",
  "--ck-connectbutton-color": "#030712",
  "--ck-connectbutton-border-radius": "4px",
  "--ck-connectbutton-font-size": "13px",
  "--ck-connectbutton-padding": "8px 16px",
  "--ck-connectbutton-hover-background": "#b2e3dc",
  "--ck-accent-color": "#96d6cd",
  "--ck-body-background": "#000000",
  "--ck-body-color": "#E2E8F0",
  "--ck-body-color-muted": "#64748B",
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
    [sepolia.id]: http("https://rpc.sepolia.org"),
  },
  ssr: false,
});
import { http, createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

export const ckTheme = {
  "--ck-font-family": "JetBrains Mono, Fira Code, Inter, ui-sans-serif, system-ui",
  "--ck-border-radius": "4px",
  "--ck-connectbutton-background": "#96d6cd",
  "--ck-connectbutton-color": "#030712",
  "--ck-connectbutton-border-radius": "4px",
  "--ck-connectbutton-font-size": "13px",
  "--ck-connectbutton-padding": "8px 16px",
  "--ck-connectbutton-hover-background": "#b2e3dc",
  "--ck-accent-color": "#96d6cd",
  "--ck-body-background": "#000000",
  "--ck-body-color": "#E2E8F0",
  "--ck-body-color-muted": "#64748B",
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
    [sepolia.id]: http("https://rpc.sepolia.org"),
  },
  ssr: false,
});
