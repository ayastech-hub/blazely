import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_ANON_KEY, process.env.VITE_SUPABASE_ANON_KEY);

// Only include the event you need from the ABI
const FACTORY_ABI = ["event Launched(address indexed token, string name, string symbol)"];

export default async function handler(req, res) {
  // 1. Only allow POST requests
  if (req.method !== 'POST') return res.status(405).json({ message: "Method not allowed" });

  const { txHash, chainId, metadata } = req.body;

  try {
    // 2. Connect to the blockchain
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const receipt = await provider.waitForTransaction(txHash);
    
    if (!receipt || receipt.status === 0) throw new Error("Transaction failed on-chain");

    // 3. Extract the address from the logs
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

    if (!tokenAddress) throw new Error("Could not find Launch event in transaction");

    // 4. Upsert to Supabase
    const { error } = await supabase.from("tokens").upsert({
      ...metadata,
      address: tokenAddress.toLowerCase(),
      chain_id: chainId,
      updated_at: new Date().toISOString()
    });

    if (error) throw error;

    return res.status(200).json({ success: true, address: tokenAddress });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
