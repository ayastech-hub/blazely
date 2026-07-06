const express = require('express');
const { ethers } = require('ethers');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Define your factory ABI (only the Launch event is needed)
const FACTORY_ABI = [
  "event Launched(address indexed token, string name, string symbol)"
];

const PROVIDERS = {
  11155111: new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL)
};

app.post('/api/verify-deployment', async (req, res) => {
  const { txHash, chainId, metadata } = req.body;

  try {
    const provider = PROVIDERS[chainId];
    if (!provider) throw new Error("Unsupported Chain ID");

    // 1. Wait for transaction to be mined
    const receipt = await provider.waitForTransaction(txHash);
    if (!receipt || receipt.status === 0) throw new Error("Transaction reverted");

    // 2. Parse logs to extract the new token address
    const iface = new ethers.Interface(FACTORY_ABI);
    let tokenAddress = null;
    
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed.name === "Launched") {
          tokenAddress = parsed.args.token;
          break;
        }
      } catch (e) { continue; }
    }

    if (!tokenAddress) throw new Error("Launch event not found in transaction logs");

    // 3. Update/Insert into Database
    const { data, error } = await supabase.from("tokens").upsert({
      ...metadata,
      address: tokenAddress.toLowerCase(),
      chain_id: chainId,
      updated_at: new Date().toISOString()
    }).select().single();

    if (error) throw error;

    res.json({ success: true, address: tokenAddress });
  } catch (err) {
    console.error("Verification Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(3000, () => console.log('Backend verifying on port 3000'));
