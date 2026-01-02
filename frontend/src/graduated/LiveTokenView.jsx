// src/components/tokens/LiveTokenView.jsx
import React, { useEffect, useMemo, useState, Suspense } from "react";
import { ethers } from "ethers";
import { Loader2, Wallet, ArrowDownUp, CheckCircle } from "lucide-react";

// Lazy heavy children so main bundle stays small.
const Chart = React.lazy(() =>
  import("../components/Chart").catch(() => ({ default: () => <div /> }))
);
const TopHolders = React.lazy(() =>
  import("../components/TopHolders").catch(() => ({
    default: () => <div />,
  }))
);

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

const UNISWAP_V2_ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)",
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)",
];

function shorten(addr = "") {
  if (!addr) return "";
  return addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
}

function parseNumberSafe(v) {
  try {
    return typeof v === "bigint" ? Number(v) : Number(v);
  } catch {
    return 0;
  }
}

/**
 * BuySellUniswap
 * - Minimal, practical Uniswap V2 router integration for swap flows.
 * - Requires env vars:
 *   VITE_UNISWAP_ROUTER_ADDRESS  (Uniswap V2-compatible router)
 *   VITE_WETH_ADDRESS            (chain WETH address)
 *
 * Usage: <BuySellUniswap token={token} />
 * token = { address, decimals (opt), symbol (opt), rpc (opt) }
 */
function BuySellUniswap({ token }) {
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputAmount, setInputAmount] = useState("");
  const [activeTab, setActiveTab] = useState("Buy"); // Buy | Sell
  const [isWorking, setIsWorking] = useState(false);
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState(null);
  const [approved, setApproved] = useState(false);

  const routerAddress = import.meta.env.VITE_UNISWAP_ROUTER_ADDRESS;
  const wethAddress = import.meta.env.VITE_WETH_ADDRESS;
  const providerUrl = token?.rpc || import.meta.env.VITE_RPC_URL;

  const provider = useMemo(() => {
    try {
      return new ethers.JsonRpcProvider(providerUrl);
    } catch {
      return null;
    }
  }, [providerUrl]);

  // connect wallet (ethers via window.ethereum)
  const connectWallet = async () => {
    setError(null);
    try {
      if (!window?.ethereum) throw new Error("No injected wallet found");
      const web3 = new ethers.BrowserProvider(window.ethereum);
      const accounts = await web3.send("eth_requestAccounts", []);
      setWalletAddress(accounts?.[0] ?? null);
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  // helper: get signer (after user connected)
  const getSigner = () => {
    if (!window?.ethereum) return null;
    return new ethers.BrowserProvider(window.ethereum).getSigner();
  };

  // refresh allowance for SELL path
  useEffect(() => {
    if (!walletAddress || !token?.address || !provider || !routerAddress)
      return;
    let cancelled = false;

    (async () => {
      try {
        const erc20 = new ethers.Contract(token.address, ERC20_ABI, provider);
        const allowance = await erc20.allowance(walletAddress, routerAddress);
        if (!cancelled) setApproved(allowance > 0n);
      } catch (e) {
        console.warn("Allowance check failed", e);
      }
    })();

    return () => (cancelled = true);
  }, [walletAddress, token, provider, routerAddress]);

  // quote function using router.getAmountsOut (Uniswap V2 style)
  useEffect(() => {
    setQuote(null);
    setError(null);
    if (!inputAmount || Number(inputAmount) <= 0) return;
    if (!provider || !routerAddress || !wethAddress || !token?.address) return;

    let cancelled = false;

    (async () => {
      try {
        const router = new ethers.Contract(
          routerAddress,
          UNISWAP_V2_ROUTER_ABI,
          provider
        );
        if (activeTab === "Buy") {
          // user will input ETH amount -> getAmountsOut(amountIn, [WETH, TOKEN])
          const amountInWei = ethers.parseEther(String(inputAmount));
          const path = [wethAddress, token.address];
          const amounts = await router.getAmountsOut(amountInWei, path);
          // amounts is array of BigNumber; amounts[1] is token amount
          if (!cancelled) {
            setQuote({
              amountOut: amounts?.[1]?.toString() ?? "0",
              amountIn: amountInWei.toString(),
            });
          }
        } else {
          // Sell: user inputs token amount -> getAmountsOut(amountIn, [TOKEN, WETH])
          const decimals =
            token.decimals ??
            (await new ethers.Contract(token.address, ERC20_ABI, provider)
              .decimals()
              .catch(() => 18));
          const amountIn = ethers.parseUnits(String(inputAmount), decimals);
          const path = [token.address, wethAddress];
          const amounts = await router.getAmountsOut(amountIn, path);
          if (!cancelled) {
            setQuote({
              amountOut: amounts?.[1]?.toString() ?? "0",
              amountIn: amountIn.toString(),
            });
          }
        }
      } catch (e) {
        console.warn("Quote error", e);
        if (!cancelled) setError("Failed to quote price");
      }
    })();

    return () => (cancelled = true);
  }, [inputAmount, activeTab, provider, routerAddress, wethAddress, token]);

  // do approve (maxUint) for sell
  const doApprove = async () => {
    setError(null);
    if (!walletAddress || !token?.address || !routerAddress) {
      setError("Missing wallet, token or router");
      return;
    }
    try {
      setIsWorking(true);
      const signer = getSigner();
      if (!signer) throw new Error("Wallet signer not available");
      const erc20 = new ethers.Contract(token.address, ERC20_ABI, signer);
      const tx = await erc20.approve(routerAddress, ethers.MaxUint256);
      await tx.wait();
      setApproved(true);
    } catch (e) {
      console.error("Approve failed", e);
      setError(e?.message ?? String(e));
    } finally {
      setIsWorking(false);
    }
  };

  // execute swap
  const doSwap = async () => {
    setError(null);
    if (!walletAddress || !token?.address || !routerAddress || !provider) {
      setError("Missing required data");
      return;
    }
    if (!inputAmount || Number(inputAmount) <= 0) {
      setError("Enter an amount");
      return;
    }

    try {
      setIsWorking(true);
      const signer = getSigner();
      if (!signer) throw new Error("Signer not found");

      const router = new ethers.Contract(
        routerAddress,
        UNISWAP_V2_ROUTER_ABI,
        signer
      );
      const deadline = Math.floor(Date.now() / 1000) + 60 * 5; // 5 mins
      // conservative slippage handling
      const slippagePct = 0.5; // default 0.5%
      if (activeTab === "Buy") {
        // ETH -> Token
        const value = ethers.parseEther(String(inputAmount));
        const expectedOut = quote?.amountOut
          ? ethers.BigNumber.from(quote.amountOut)
          : null;
        const minOut = expectedOut
          ? expectedOut.mul(10000 - Math.floor(slippagePct * 100)).div(10000)
          : 0n;
        const path = [wethAddress, token.address];
        const tx = await router.swapExactETHForTokens(
          minOut,
          path,
          walletAddress,
          deadline,
          { value }
        );
        const receipt = await tx.wait();
        return receipt;
      } else {
        // Token -> ETH
        // ensure approved
        if (!approved) {
          setError("Token not approved for router. Approve first.");
          setIsWorking(false);
          return null;
        }
        const decimals =
          token.decimals ??
          (await new ethers.Contract(token.address, ERC20_ABI, provider)
            .decimals()
            .catch(() => 18));
        const amountIn = ethers.parseUnits(String(inputAmount), decimals);
        const expectedOut = quote?.amountOut
          ? ethers.BigNumber.from(quote.amountOut)
          : null;
        const minOut = expectedOut
          ? expectedOut.mul(10000 - Math.floor(slippagePct * 100)).div(10000)
          : 0n;
        const path = [token.address, wethAddress];
        const tx = await router.swapExactTokensForETH(
          amountIn,
          minOut,
          path,
          walletAddress,
          deadline
        );
        const receipt = await tx.wait();
        return receipt;
      }
    } catch (e) {
      console.error("Swap failed", e);
      setError(e?.message ?? String(e));
      throw e;
    } finally {
      setIsWorking(false);
    }
  };

  const buttonLabel = isWorking
    ? "Processing..."
    : activeTab === "Buy"
      ? `Buy ${token.symbol ?? ""}`
      : `Sell ${token.symbol ?? ""}`;

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Wallet />
          <div>
            <div className="text-xs text-slate-400">Wallet</div>
            <div className="text-sm font-mono text-slate-100">
              {walletAddress ? shorten(walletAddress) : "Not connected"}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("Buy")}
            className={`px-3 py-1 rounded ${activeTab === "Buy" ? "bg-lime-500 text-black" : "bg-slate-800 text-slate-300"}`}
          >
            Buy
          </button>
          <button
            onClick={() => setActiveTab("Sell")}
            className={`px-3 py-1 rounded ${activeTab === "Sell" ? "bg-red-500 text-black" : "bg-slate-800 text-slate-300"}`}
          >
            Sell
          </button>
        </div>
      </div>

      <div className="mb-3">
        <input
          type="text"
          inputMode="decimal"
          placeholder={
            activeTab === "Buy"
              ? "ETH amount"
              : `${token.symbol ?? "TOKEN"} amount`
          }
          value={inputAmount}
          onChange={(e) => setInputAmount(e.target.value)}
          className="w-full bg-slate-800 rounded p-2 text-white font-mono text-lg outline-none"
        />
      </div>

      {quote && (
        <div className="mb-3 text-sm text-slate-300">
          <div>
            Quote:
            {activeTab === "Buy"
              ? `${ethers.formatUnits(quote.amountOut, token.decimals ?? 18)} ${token.symbol}`
              : `${ethers.formatEther(quote.amountOut)} ETH`}
          </div>
        </div>
      )}

      {error && <div className="mb-3 text-xs text-rose-400">{error}</div>}

      <div className="flex gap-2">
        {!walletAddress ? (
          <button
            onClick={connectWallet}
            className="flex-1 py-2 rounded bg-purple-600 text-white"
          >
            Connect Wallet
          </button>
        ) : activeTab === "Sell" && !approved ? (
          <button
            onClick={doApprove}
            disabled={isWorking}
            className="flex-1 py-2 rounded bg-purple-600 text-white"
          >
            {isWorking ? "Approving..." : `Approve ${token.symbol}`}
          </button>
        ) : (
          <button
            onClick={doSwap}
            disabled={isWorking}
            className="flex-1 py-2 rounded bg-lime-500 text-black"
          >
            {isWorking ? (
              <Loader2 className="animate-spin inline mr-2" />
            ) : (
              <>{buttonLabel}</>
            )}
          </button>
        )}

        <button
          onClick={() => {
            setInputAmount("");
            setQuote(null);
            setError(null);
          }}
          className="px-3 py-2 rounded bg-slate-800 text-slate-300"
        >
          Clear
        </button>
      </div>

      <div className="mt-3 text-xs text-slate-400">
        Slippage: 0.5% (hardcoded demo). Deadline: 5m.
      </div>
    </div>
  );
}

export default function LiveTokenView({
  token,
  marketCap,
  priceUsd,
  volume24h,
  liquidityUsd,
  totalSupplyOnchain,
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <header className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {token.symbol ?? token.address}
            </h1>
            <div className="text-sm text-slate-400">{token.name ?? ""}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Price</div>
            <div className="text-lg font-semibold">
              ${parseNumberSafe(priceUsd).toFixed(4)}
            </div>
            <div className="text-xs text-slate-400">
              Market Cap: ${parseNumberSafe(marketCap).toFixed(2)}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Suspense
              fallback={
                <div className="h-64 flex items-center justify-center text-slate-400">
                  Loading chart…
                </div>
              }
            >
              <Chart tokenAddress={token.address} />
            </Suspense>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <h3 className="text-sm font-semibold mb-2">Recent Activity</h3>
              {/* You can place RecentTransactions component here */}
              <div className="text-xs text-slate-400">
                Recent trades and swaps will appear here.
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div>
              <BuySellUniswap token={token} />
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <h3 className="text-sm font-semibold mb-2">Top Holders</h3>
              <Suspense
                fallback={
                  <div className="text-slate-400">Loading holders…</div>
                }
              >
                <TopHolders
                  tokenAddress={token.address}
                  providerUrl={token.rpc}
                  decimals={token.decimals}
                  fromBlock={token.deploymentBlock}
                />
              </Suspense>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <h3 className="text-sm font-semibold mb-2">On-chain Stats</h3>
              <div className="text-xs text-slate-400">
                Market Cap: ${marketCap}
              </div>
              <div className="text-xs text-slate-400">
                Liquidity (USD): ${liquidityUsd}
              </div>
              <div className="text-xs text-slate-400">
                24h Volume: ${volume24h}
              </div>
              <div className="text-xs text-slate-400">
                Total Supply: {totalSupplyOnchain}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
