// src/wagmi.js
import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { getDefaultConfig } from "connectkit";

export const config = createConfig(
  getDefaultConfig({
    appName: "MyBaseApp",
    walletConnectProjectId: "YOUR_WALLETCONNECT_ID", // get one free from WalletConnect cloud
    chains: [base],
    transports: {
      [base.id]: http("https://mainnet.base.org"),
    },
  })
);
