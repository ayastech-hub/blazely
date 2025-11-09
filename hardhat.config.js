// hardhat.config.js  (ESM)
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
dotenv.config();

const { RPC_URL, PRIVATE_KEY } = process.env;

export default {
  solidity: "0.8.20",
  networks: {
    testnet: {
      url: RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};
