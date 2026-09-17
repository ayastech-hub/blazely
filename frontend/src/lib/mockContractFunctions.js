// src/lib/mockContractFunctions.js
//
// UI-ONLY MOCK LAYER — no real contract or backend calls happen here yet.
// Every function returns fake data after a short delay, standing in for the
// real on-chain calls until the contract-side work is done. This is the same
// pattern already used elsewhere in the app (see the "ADVANCED CONFIG" note
// at the top of pages/CreateToken.jsx) — build and ship the UI now, wire the
// real logic in later without needing to touch any of the components that
// call these functions.
//
// Previously this object lived only inside pages/Locking.jsx. Extracted here
// so pages/Locking.jsx and tabP/DevToolsTab.jsx (Profile's new "Dev Tools"
// tab) both read the exact same mock lock data instead of two independent,
// silently-diverging copies.

export const mockContractFunctions = {
  // ---- Token locking ----
  async lockTokens(tokenAddress, amount, duration, beneficiary) {
    console.log("[mock] Locking tokens:", { tokenAddress, amount, duration, beneficiary });
    return new Promise((resolve) =>
      setTimeout(() => resolve({ txHash: "0x123..." }), 2000)
    );
  },

  async unlockTokens(lockId) {
    console.log("[mock] Unlocking tokens:", lockId);
    return new Promise((resolve) =>
      setTimeout(() => resolve({ txHash: "0x456..." }), 2000)
    );
  },

  // Batch unlock — used by the "Unlock All" action in Profile's Dev Tools
  // tab. Real implementation will need to decide whether this is one
  // multicall-style contract transaction or a sequence of individual
  // unlockTokens() calls surfaced as one button in the UI.
  async unlockAllTokens(lockIds) {
    console.log("[mock] Unlocking all:", lockIds);
    return new Promise((resolve) =>
      setTimeout(() => resolve({ txHash: "0x789...", count: lockIds.length }), 2000)
    );
  },

  async getUserLocks(wallet) {
    return [
      {
        id: 1,
        tokenAddress: "0x1234...5678",
        tokenSymbol: "BLZ",
        tokenName: "Blazely Utility Token",
        amount: "1,450.00",
        lockDate: new Date("2026-01-15"),
        unlockDate: new Date("2026-12-15"),
        totalDurationDays: 334,
        beneficiary: wallet,
        status: "locked",
        canUnlock: false,
      },
      {
        id: 2,
        tokenAddress: "0x9876...5432",
        tokenSymbol: "CORE-LP",
        tokenName: "CORE-WETH Liquidity Pool",
        amount: "12.84",
        lockDate: new Date("2026-05-01"),
        unlockDate: new Date("2026-07-01"),
        totalDurationDays: 61,
        beneficiary: wallet,
        status: "locked",
        canUnlock: true,
      },
    ];
  },

  // ---- Creator fee claiming ----
  async getClaimableFees(wallet) {
    return {
      claimableEth: "0.4213",
      claimableUsd: "1,284.60",
      lifetimeClaimedEth: "2.1050",
      perToken: [
        { tokenAddress: "0x1234...5678", tokenSymbol: "BLZ", claimableEth: "0.2890" },
        { tokenAddress: "0xaaaa...bbbb", tokenSymbol: "NOVA", claimableEth: "0.1323" },
      ],
    };
  },

  async claimFees(wallet) {
    console.log("[mock] Claiming fees for:", wallet);
    return new Promise((resolve) =>
      setTimeout(() => resolve({ txHash: "0xabc...", claimedEth: "0.4213" }), 2000)
    );
  },

  // ---- Bounty board ----
  async getBounties() {
    return [
      {
        id: 1,
        title: "Design a launch announcement graphic",
        category: "Design",
        rewardEth: "0.05",
        status: "open",
        submissions: 3,
        postedBy: "0x1234...5678",
        deadline: new Date("2026-08-15"),
      },
      {
        id: 2,
        title: "Write a Twitter thread explaining bonding curves",
        category: "Content",
        rewardEth: "0.03",
        status: "open",
        submissions: 1,
        postedBy: "0x9876...5432",
        deadline: new Date("2026-08-10"),
      },
      {
        id: 3,
        title: "Moderate the Telegram group for one week",
        category: "Moderation",
        rewardEth: "0.08",
        status: "in_review",
        submissions: 5,
        postedBy: "0xaaaa...bbbb",
        deadline: new Date("2026-08-05"),
      },
      {
        id: 4,
        title: "Record a 60-second product walkthrough video",
        category: "Content",
        rewardEth: "0.12",
        status: "completed",
        submissions: 7,
        postedBy: "0x1234...5678",
        deadline: new Date("2026-07-20"),
      },
    ];
  },

  async submitBountyEntry(bountyId, submissionUrl) {
    console.log("[mock] Submitting entry:", { bountyId, submissionUrl });
    return new Promise((resolve) =>
      setTimeout(() => resolve({ submissionId: Math.floor(Math.random() * 1000) }), 1500)
    );
  },
};
