// src/hooks/useBuySellLogic.js
import React from "react";
import { useState, useMemo, useEffect } from "react";
import {
  useAccount,
  useBalance,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { parseEther, parseUnits } from "viem";
import { maxUint256 } from "viem";

/**
 * This hook contains ALL logic previously inside BuySellSimple except the JSX.
 * It preserves variable names, effects, ABIs, safety checks and transaction flows.
 */

const LAUNCHPAD_ABI_FULL = [
  {
    inputs: [{ internalType: "address", name: "_token", type: "address" }],
    name: "buy",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_token", type: "address" },
      { internalType: "uint256", name: "_amount", type: "uint256" },
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

const LAUNCHPAD_ADDRESS_RAW =
  import.meta.env.VITE_CONTRACT_ADDRESS || import.meta.env.CONTRACT_ADDRESS;

const LAUNCHPAD_ADDRESS =
  LAUNCHPAD_ADDRESS_RAW &&
  LAUNCHPAD_ADDRESS_RAW.startsWith("0x") &&
  LAUNCHPAD_ADDRESS_RAW.length === 42
    ? LAUNCHPAD_ADDRESS_RAW
    : undefined;

const SAFE_GAS_LIMIT = 3000000n;

export function useBuySellLogic(token) {
  // keep same state names
  const [activeTab, setActiveTab] = useState("Buy");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState(0.5);

  const { address, isConnected } = useAccount();
  const walletConnected = isConnected;

  const isContractSetup = !!LAUNCHPAD_ADDRESS;

  // write contract for swap
  const {
    data: hash,
    writeContract,
    isPending: isSwapPending,
    isError: isTxError,
    error: txError,
    reset: resetSwapTx,
  } = useWriteContract();

  // wait for swap confirmation
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({ hash });

  // write contract for approve
  const {
    data: approveHash,
    writeContract: writeApprove,
    isPending: isApprovePending,
    isError: isApproveError,
    reset: resetApproveTx,
  } = useWriteContract();

  // wait for approve confirmation
  const {
    isLoading: isApproveConfirming,
    isSuccess: isApproveConfirmed,
    error: approveConfirmError,
  } = useWaitForTransactionReceipt({ hash: approveHash });

  const isPending = isSwapPending || isApprovePending;
  const isConfirmingAny = isConfirming || isApproveConfirming;
  const isAnyTxError =
    isTxError || isApproveError || confirmError || approveConfirmError;

  // --- Balances ---
  const { data: ethBalanceData, refetch: refetchEthBalance } = useBalance({
    address: address,
    enabled: isConnected,
  });
  const ethBalance = Number(ethBalanceData?.formatted ?? 0);

  const { data: tokenBalanceData, refetch: refetchTokenBalance } = useBalance({
    address: address,
    token: token?.address,
    enabled: isConnected && !!token?.address,
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

  // --- Allowance Check (keeps watching) ---
  const {
    data: tokenAllowance,
    refetch: refetchTokenAllowance,
    isError: tokenAllowanceError,
  } = useReadContract({
    address: token?.address,
    abi: ERC20_ABI_APPROVAL,
    functionName: "allowance",
    args: [
      address || "0x0000000000000000000000000000000000000000",
      LAUNCHPAD_ADDRESS || "0x0000000000000000000000000000000000000000",
    ],
    chainId: token?.chainId,
    query: {
      enabled: !!token?.address && isConnected && !!LAUNCHPAD_ADDRESS,
      watch: true,
    },
  });

  const isAllowanceLoading =
    !!token?.address &&
    isConnected &&
    !!LAUNCHPAD_ADDRESS &&
    (tokenAllowance === undefined || tokenAllowance === null);

  // Calculate allowance sufficiency
  const isAllowanceSufficient = useMemo(() => {
    if (activeTab !== "Sell" || !amount) return true;
    if (tokenAllowance === undefined || tokenAllowance === null) return false;

    try {
      const amountToSellWei = parseUnits(amount, tokenDecimals); // bigint
      const allowanceBig =
        typeof tokenAllowance === "bigint"
          ? tokenAllowance
          : BigInt(tokenAllowance.toString());
      return allowanceBig >= amountToSellWei;
    } catch (err) {
      console.error("Allowance parse error", err);
      return false;
    }
  }, [activeTab, amount, tokenAllowance, tokenDecimals]);

  React.useEffect(() => {
    if (activeTab === "Sell") {
      try {
        console.debug(
          "[useBuySellLogic] allowance debug",
          "allowance:",
          tokenAllowance
            ? (tokenAllowance.toString?.() ?? tokenAllowance)
            : tokenAllowance,
          "amount:",
          amount,
          "decimals:",
          tokenDecimals
        );
      } catch (e) {}
    }
  }, [tokenAllowance, amount, tokenDecimals, activeTab]);

  // --- Helpers & UI helpers to return ---
  const getInputSymbol = () =>
    activeTab === "Buy" ? "ETH" : (token?.symbol ?? "TOKEN");
  const getInputBalance = () =>
    activeTab === "Buy" ? ethBalance : tokenBalance;
  const getReceiveSymbol = () =>
    activeTab === "Buy" ? (token?.symbol ?? "TOKEN") : "ETH";

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
    const currentBalance = getInputBalance();
    return inputAmount > currentBalance && inputAmount > 0;
  }, [walletConnected, activeTab, amount, ethBalance, tokenBalance]);

  // --- Transaction Handlers (identical to original) ---
  const handleBuy = () => {
    if (!token?.address || !amount || !isContractSetup) return;
    try {
      const value = parseEther(amount);
      if (value <= 0n) return;

      writeContract({
        address: LAUNCHPAD_ADDRESS,
        abi: LAUNCHPAD_ABI_FULL,
        functionName: "buy",
        args: [token.address],
        value,
        gas: SAFE_GAS_LIMIT,
      });
    } catch (error) {
      console.error("Error preparing buy tx:", error);
    }
  };

  const handleSell = () => {
    if (
      !token?.address ||
      !amount ||
      !isContractSetup ||
      !isAllowanceSufficient
    )
      return;
    try {
      const amountToSell = parseUnits(amount, tokenDecimals);
      if (amountToSell <= 0n) return;

      writeContract({
        address: LAUNCHPAD_ADDRESS,
        abi: LAUNCHPAD_ABI_FULL,
        functionName: "sell",
        args: [token.address, amountToSell],
        gas: SAFE_GAS_LIMIT,
      });
    } catch (error) {
      console.error("Error preparing sell tx:", error);
    }
  };

  const handleApprove = () => {
    if (!token?.address || !isContractSetup) return;

    resetSwapTx(); // Clear previous sell state

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

  // --- Effects for refetching and resetting (kept) ---
  useEffect(() => {
    if (isConfirmed) {
      setAmount("");
      refetchEthBalance();
      refetchTokenBalance();
      try {
        if (typeof refetchTokenAllowance === "function")
          refetchTokenAllowance();
      } catch {}
    }
  }, [
    isConfirmed,
    refetchEthBalance,
    refetchTokenBalance,
    refetchTokenAllowance,
  ]);

  useEffect(() => {
    if (isApproveConfirmed) {
      try {
        if (typeof refetchTokenAllowance === "function")
          refetchTokenAllowance();
      } catch {}
      resetApproveTx();
    }
  }, [isApproveConfirmed, refetchTokenAllowance, resetApproveTx]);

  useEffect(() => {
    resetSwapTx();
    resetApproveTx();
  }, [activeTab, amount, resetSwapTx, resetApproveTx]);

  // --- Button states & text (kept identical) ---
  const isButtonDisabled =
    !isContractSetup ||
    !walletConnected ||
    isInsufficientBalance ||
    !amount ||
    isPending ||
    isConfirmingAny ||
    isAllowanceLoading;

  // return UI-friendly nodes for buttonText — keep Loader2 / CheckCircle out of hook to avoid adding UI libs here.
  // BUT original used Loader2 / CheckCircle icons from lucide-react. We can return a plain text fallback and flags,
  // then let UI build final button content. However user asked to NOT remove anything — keep same JSX strings.
  // To avoid importing lucide-react here, we'll return a shape that UI will use to render. (UI still retains icons.)
  const buttonStatus = useMemo(() => {
    if (!isContractSetup)
      return {
        type: "error",
        text: "ERROR: Launchpad Address Missing/Invalid",
      };
    if (!isConnected) return { type: "connect", text: "Connect Wallet" };

    if (isPending) return { type: "pending", text: "Confirm in Wallet..." };
    if (isApproveConfirming) return { type: "approving", text: "Approving..." };
    if (isConfirming) return { type: "confirming", text: `${activeTab}ing...` };
    if (isConfirmed || isApproveConfirmed)
      return { type: "success", text: "Success!" };
    if (isInsufficientBalance)
      return {
        type: "insufficient",
        text: `Insufficient ${getInputSymbol()} Balance`,
      };
    if (!amount) return { type: "empty", text: "Enter an amount" };

    if (activeTab === "Sell" && !isAllowanceSufficient) {
      return { type: "approve", text: `Approve ${token?.symbol ?? "TOKEN"}` };
    }

    return {
      type: "normal",
      text:
        activeTab === "Buy"
          ? `Buy ${token?.symbol ?? "TOKEN"}`
          : `Sell ${token?.symbol ?? "TOKEN"}`,
    };
  }, [
    isContractSetup,
    isConnected,
    isPending,
    isApproveConfirming,
    isConfirming,
    isConfirmed,
    isApproveConfirmed,
    isInsufficientBalance,
    activeTab,
    amount,
    isAllowanceSufficient,
  ]);

  const transactionMessage = useMemo(() => {
    if (isConfirmed)
      return {
        type: "success",
        text: `Swap successful! Hash: ${hash?.substring(0, 6)}...`,
      };
    if (isApproveConfirmed)
      return {
        type: "success",
        text: `Approval successful! Now you can sell your tokens.`,
      };

    if (isAnyTxError) {
      const error = txError || confirmError || approveConfirmError;
      let message = error?.shortMessage || "Transaction failed.";

      if (message.includes("ContractFunctionExecutionError")) {
        message = `Transaction reverted. Check chain explorer for details.`;
      }

      if (activeTab === "Sell" && !isAllowanceSufficient && isTxError) {
        message = "Sell failed: Contract needs approval to spend your tokens.";
      }

      return {
        type: "error",
        text: message,
      };
    }
    return null;
  }, [
    isConfirmed,
    hash,
    isAnyTxError,
    txError,
    confirmError,
    approveConfirmError,
    isApproveConfirmed,
    activeTab,
    isAllowanceSufficient,
  ]);

  const buttonClassName = useMemo(() => {
    if (
      activeTab === "Sell" &&
      !isAllowanceSufficient &&
      walletConnected &&
      !isPending &&
      !isConfirmingAny
    ) {
      return "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/30";
    }

    if (!walletConnected || !isContractSetup) {
      return "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/30";
    }
    if (isInsufficientBalance || isAnyTxError) {
      return "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/30";
    }
    if (activeTab === "Buy") {
      return "bg-lime-500 hover:bg-lime-400 text-black shadow-lg shadow-lime-500/30";
    }
    return "bg-red-500 hover:bg-red-400 text-black shadow-lg shadow-red-500/30";
  }, [
    activeTab,
    isAllowanceSufficient,
    walletConnected,
    isPending,
    isConfirmingAny,
    isInsufficientBalance,
    isAnyTxError,
    isContractSetup,
  ]);

  // expose everything needed by UI
  return {
    // state
    activeTab,
    setActiveTab,
    amount,
    setAmount,
    slippage,
    setSlippage,

    // balances & helpers
    ethBalance,
    tokenBalance,
    tokenDecimals,
    getInputSymbol,
    getInputBalance,
    getReceiveSymbol,

    // presets & input helpers
    fixedPresets,
    setPresetAmount,
    handleAmountChange,

    // allowance & status flags
    tokenAllowance,
    isAllowanceLoading,
    isAllowanceSufficient,
    isInsufficientBalance,

    // tx handlers & statuses
    handleSwap,
    handleApprove,
    handleBuy,
    handleSell,

    // UI presentation
    isPending,
    isConfirmingAny,
    isAnyTxError,
    buttonStatus, // {type, text} - UI can create icons/text identical to original
    buttonClassName,
    isButtonDisabled,
    transactionMessage,
    hash,
  };
}
