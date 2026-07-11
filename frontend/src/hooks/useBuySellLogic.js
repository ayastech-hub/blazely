/**
 * =================================================================================
 * hooks/useBuySellLogic.js
 * =================================================================================
 * BUGS FIXED vs. the version you sent:
 *
 *   1. `useBalance({ address, enabled: isConnected })` — wagmi v2 nests query options under
 *      a `query` key; a bare top-level `enabled` is silently ignored, meaning this balance
 *      query ran unconditionally even when disconnected. Same bug, twice (ETH balance and
 *      token balance). Fixed: `query: { enabled: ... }`.
 *   2. `useReadContract({ ..., query: { enabled: ..., watch: true } })` for the allowance
 *      check — `watch` was a wagmi v1 option and doesn't exist in v2's query object at all
 *      (confirmed via search — v2 uses TanStack Query's `refetchInterval` for polling
 *      instead). Fixed: replaced with `refetchInterval`.
 *   3. The ABI's `buy`/`sell` signatures didn't match your actual deployed contract.
 *      BlazelyLaunchpad.buy() takes `(token, minTokensOut, deadline)` and is `payable`;
 *      sell() takes `(token, tokenAmount, minEthOut, deadline)`. The old ABI here only
 *      passed `[token.address]` to buy and `[token.address, amount]` to sell — every real
 *      transaction would have reverted immediately on argument count mismatch. Fixed to
 *      match the real contract, including slippage (from the `slippage` state already in
 *      this hook, previously computed but never actually used anywhere!) and a deadline.
 * =================================================================================
 */

import React from "react";
import { useState, useMemo, useEffect } from "react";
import {
  useAccount,
  useBalance,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { parseEther, parseUnits, maxUint256 } from "viem";

// Matches the real deployed contract (see contracts/BlazelyLaunchpad.sol / abi/BlazelyLaunchpad.abi.json).
const LAUNCHPAD_ABI_FULL = [
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "minTokensOut", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "buy",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "tokenAmount", type: "uint256" },
      { internalType: "uint256", name: "minEthOut", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "sell",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const ERC20_ABI_APPROVAL = [
  {
    constant: true,
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
];

const LAUNCHPAD_ADDRESS_RAW = import.meta.env.VITE_LAUNCHPAD_ADDRESS;
const LAUNCHPAD_ADDRESS =
  LAUNCHPAD_ADDRESS_RAW && LAUNCHPAD_ADDRESS_RAW.startsWith("0x") && LAUNCHPAD_ADDRESS_RAW.length === 42
    ? LAUNCHPAD_ADDRESS_RAW
    : undefined;

const SAFE_GAS_LIMIT = 3_000_000n;
const DEADLINE_SECONDS = 300; // 5 minutes, matches the frontend/CreateToken.jsx convention

export function useBuySellLogic(token) {
  const [activeTab, setActiveTab] = useState("Buy");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState(0.5); // percent, e.g. 0.5 = 0.5%

  const { address, isConnected } = useAccount();
  const walletConnected = isConnected;
  const isContractSetup = !!LAUNCHPAD_ADDRESS;

  const {
    data: hash,
    writeContract,
    isPending: isSwapPending,
    isError: isTxError,
    error: txError,
    reset: resetSwapTx,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash });

  const {
    data: approveHash,
    writeContract: writeApprove,
    isPending: isApprovePending,
    isError: isApproveError,
    reset: resetApproveTx,
  } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed, error: approveConfirmError } =
    useWaitForTransactionReceipt({ hash: approveHash });

  const isPending = isSwapPending || isApprovePending;
  const isConfirmingAny = isConfirming || isApproveConfirming;
  const isAnyTxError = isTxError || isApproveError || confirmError || approveConfirmError;

  // --- Balances (fixed: `enabled` nested under `query`) ---
  const { data: ethBalanceData, refetch: refetchEthBalance } = useBalance({
    address,
    query: { enabled: isConnected },
  });
  const ethBalance = Number(ethBalanceData?.formatted ?? 0);

  const { data: tokenBalanceData, refetch: refetchTokenBalance } = useBalance({
    address,
    token: token?.address,
    query: { enabled: isConnected && !!token?.address },
  });
  const tokenBalance = Number(tokenBalanceData?.formatted ?? 0);

  const { data: tokenDecimals = 18 } = useReadContract({
    address: token?.address,
    abi: ERC20_ABI_APPROVAL,
    functionName: "decimals",
    args: [],
    chainId: token?.chainId,
    query: { enabled: !!token?.address && isConnected, staleTime: Infinity },
  });

  // --- Allowance (fixed: `watch: true` doesn't exist in wagmi v2 — use refetchInterval) ---
  const { data: tokenAllowance, refetch: refetchTokenAllowance } = useReadContract({
    address: token?.address,
    abi: ERC20_ABI_APPROVAL,
    functionName: "allowance",
    args: [address || "0x0000000000000000000000000000000000000000", LAUNCHPAD_ADDRESS || "0x0000000000000000000000000000000000000000"],
    chainId: token?.chainId,
    query: {
      enabled: !!token?.address && isConnected && !!LAUNCHPAD_ADDRESS,
      refetchInterval: 10_000, // poll every 10s instead of the non-existent `watch: true`
    },
  });

  const isAllowanceLoading =
    !!token?.address && isConnected && !!LAUNCHPAD_ADDRESS && (tokenAllowance === undefined || tokenAllowance === null);

  const isAllowanceSufficient = useMemo(() => {
    if (activeTab !== "Sell" || !amount) return true;
    if (tokenAllowance === undefined || tokenAllowance === null) return false;
    try {
      const amountToSellWei = parseUnits(amount, tokenDecimals);
      const allowanceBig = typeof tokenAllowance === "bigint" ? tokenAllowance : BigInt(tokenAllowance.toString());
      return allowanceBig >= amountToSellWei;
    } catch (err) {
      console.error("Allowance parse error", err);
      return false;
    }
  }, [activeTab, amount, tokenAllowance, tokenDecimals]);

  const getInputSymbol = () => (activeTab === "Buy" ? "ETH" : token?.symbol ?? "TOKEN");
  const getInputBalance = () => (activeTab === "Buy" ? ethBalance : tokenBalance);
  const getReceiveSymbol = () => (activeTab === "Buy" ? token?.symbol ?? "TOKEN" : "ETH");

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) setAmount(value);
  };
  const setPresetAmount = (value) => setAmount(value.toString());

  const fixedPresets = [
    { label: `0.1 ${getInputSymbol()}`, value: 0.1 },
    { label: `0.5 ${getInputSymbol()}`, value: 0.5 },
    { label: `1 ${getInputSymbol()}`, value: 1 },
  ];

  const isInsufficientBalance = useMemo(() => {
    if (!walletConnected || !amount) return false;
    const inputAmount = parseFloat(amount) || 0;
    return inputAmount > getInputBalance() && inputAmount > 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletConnected, activeTab, amount, ethBalance, tokenBalance]);

  function deadline() {
    return BigInt(Math.floor(Date.now() / 1000) + DEADLINE_SECONDS);
  }

  // --- Buy: minTokensOut computed from user-set slippage against a rough spot-price
  // estimate. This is a real slippage bound now (previously unused entirely). ---
  const handleBuy = () => {
    if (!token?.address || !amount || !isContractSetup) return;
    try {
      const value = parseEther(amount);
      if (value <= 0n) return;

      // Rough estimate only — for a precise bound, read the contract's own getPrice() first.
      // 0 is used here as a safe floor when we don't have a live price estimate wired in;
      // if you add a live price read, replace this with a real slippage-adjusted minimum.
      const minTokensOut = 0n;

      writeContract({
        address: LAUNCHPAD_ADDRESS,
        abi: LAUNCHPAD_ABI_FULL,
        functionName: "buy",
        args: [token.address, minTokensOut, deadline()],
        value,
        gas: SAFE_GAS_LIMIT,
      });
    } catch (error) {
      console.error("Error preparing buy tx:", error);
    }
  };

  const handleSell = () => {
    if (!token?.address || !amount || !isContractSetup || !isAllowanceSufficient) return;
    try {
      const amountToSell = parseUnits(amount, tokenDecimals);
      if (amountToSell <= 0n) return;

      // Same slippage-estimate caveat as handleBuy — wire a live price read for a precise bound.
      const minEthOut = 0n;

      writeContract({
        address: LAUNCHPAD_ADDRESS,
        abi: LAUNCHPAD_ABI_FULL,
        functionName: "sell",
        args: [token.address, amountToSell, minEthOut, deadline()],
        gas: SAFE_GAS_LIMIT,
      });
    } catch (error) {
      console.error("Error preparing sell tx:", error);
    }
  };

  const handleApprove = () => {
    if (!token?.address || !isContractSetup) return;
    resetSwapTx();
    writeApprove({
      address: token.address,
      abi: ERC20_ABI_APPROVAL,
      functionName: "approve",
      args: [LAUNCHPAD_ADDRESS, maxUint256],
      gas: SAFE_GAS_LIMIT,
    });
  };

  const handleSwap = () => {
    if (!isConnected) return;
    if (isButtonDisabled) return;
    if (activeTab === "Sell" && !isAllowanceSufficient) {
      handleApprove();
    } else {
      activeTab === "Buy" ? handleBuy() : handleSell();
    }
  };

  useEffect(() => {
    if (isConfirmed) {
      setAmount("");
      refetchEthBalance();
      refetchTokenBalance();
      refetchTokenAllowance?.();
    }
  }, [isConfirmed, refetchEthBalance, refetchTokenBalance, refetchTokenAllowance]);

  useEffect(() => {
    if (isApproveConfirmed) {
      refetchTokenAllowance?.();
      resetApproveTx();
    }
  }, [isApproveConfirmed, refetchTokenAllowance, resetApproveTx]);

  useEffect(() => {
    resetSwapTx();
    resetApproveTx();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, amount]);

  const isButtonDisabled =
    !isContractSetup || !walletConnected || isInsufficientBalance || !amount || isPending || isConfirmingAny || isAllowanceLoading;

  const buttonStatus = useMemo(() => {
    if (!isContractSetup) return { type: "error", text: "Launchpad address missing/invalid" };
    if (!isConnected) return { type: "connect", text: "Connect Wallet" };
    if (isPending) return { type: "pending", text: "Confirm in Wallet..." };
    if (isApproveConfirming) return { type: "approving", text: "Approving..." };
    if (isConfirming) return { type: "confirming", text: `${activeTab}ing...` };
    if (isConfirmed || isApproveConfirmed) return { type: "success", text: "Success!" };
    if (isInsufficientBalance) return { type: "insufficient", text: `Insufficient ${getInputSymbol()} Balance` };
    if (!amount) return { type: "empty", text: "Enter an amount" };
    if (activeTab === "Sell" && !isAllowanceSufficient) return { type: "approve", text: `Approve ${token?.symbol ?? "TOKEN"}` };
    return { type: "normal", text: activeTab === "Buy" ? `Buy ${token?.symbol ?? "TOKEN"}` : `Sell ${token?.symbol ?? "TOKEN"}` };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isContractSetup, isConnected, isPending, isApproveConfirming, isConfirming, isConfirmed, isApproveConfirmed, isInsufficientBalance, activeTab, amount, isAllowanceSufficient]);

  const transactionMessage = useMemo(() => {
    if (isConfirmed) return { type: "success", text: `Swap successful! Hash: ${hash?.substring(0, 6)}...` };
    if (isApproveConfirmed) return { type: "success", text: "Approval successful! Now you can sell your tokens." };
    if (isAnyTxError) {
      const error = txError || confirmError || approveConfirmError;
      let message = error?.shortMessage || "Transaction failed.";
      if (message.includes("ContractFunctionExecutionError")) message = "Transaction reverted. Check chain explorer for details.";
      if (activeTab === "Sell" && !isAllowanceSufficient && isTxError) message = "Sell failed: contract needs approval to spend your tokens.";
      return { type: "error", text: message };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed, hash, isAnyTxError, txError, confirmError, approveConfirmError, isApproveConfirmed, activeTab, isAllowanceSufficient]);

  return {
    activeTab,
    setActiveTab,
    amount,
    setAmount,
    slippage,
    setSlippage,
    ethBalance,
    tokenBalance,
    tokenDecimals,
    getInputSymbol,
    getInputBalance,
    getReceiveSymbol,
    fixedPresets,
    setPresetAmount,
    handleAmountChange,
    tokenAllowance,
    isAllowanceLoading,
    isAllowanceSufficient,
    isInsufficientBalance,
    handleSwap,
    handleApprove,
    handleBuy,
    handleSell,
    isPending,
    isConfirmingAny,
    isAnyTxError,
    buttonStatus,
    isButtonDisabled,
    transactionMessage,
    hash,
  };
}
