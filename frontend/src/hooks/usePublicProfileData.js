// src/hooks/usePublicProfileData.js
//
// Data source for viewing another wallet's public profile. Unlike
// useProfileData (which owns write actions for the connected user's own
// profile), this hook is read-only for profile data and only supports one
// write action: following/unfollowing the viewed wallet from the connected
// wallet's perspective.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  TX_PAGE_SIZE,
  fetchUserRow,
  fetchCreatedTokens,
  fetchPortfolio,
  fetchTransactionsPage,
  fetchFollowCounts,
  fetchIsFollowing,
  setFollowState,
} from "./profileQueries";

export function usePublicProfileData(viewingAddress, connectedAddress) {
  const viewingWallet = viewingAddress ? viewingAddress.toLowerCase() : null;
  const connectedWallet = connectedAddress ? connectedAddress.toLowerCase() : null;
  const isOwnProfile = Boolean(viewingWallet && connectedWallet && viewingWallet === connectedWallet);

  const [user, setUser] = useState(null);
  const [createdTokens, setCreatedTokens] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
  const [loadingMoreTransactions, setLoadingMoreTransactions] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const txPageRef = useRef(0);

  const loadAll = useCallback(async () => {
    if (!viewingWallet) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    txPageRef.current = 0;
    try {
      const [userRow, created, holdings, txPage, counts, following] = await Promise.all([
        fetchUserRow(viewingWallet),
        fetchCreatedTokens(viewingWallet),
        fetchPortfolio(viewingWallet),
        fetchTransactionsPage(viewingWallet, 0),
        fetchFollowCounts(viewingWallet),
        fetchIsFollowing(connectedWallet, viewingWallet),
      ]);
      setUser(userRow);
      setCreatedTokens(created);
      setPortfolio(holdings);
      setTransactions(txPage);
      setHasMoreTransactions(txPage.length === TX_PAGE_SIZE);
      setFollowCounts(counts);
      setIsFollowing(following);
      txPageRef.current = 1;
    } catch (err) {
      console.error("usePublicProfileData: failed to load profile data", err);
      setError(err.message || "Failed to load this profile.");
    } finally {
      setLoading(false);
    }
  }, [viewingWallet, connectedWallet]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const loadMoreTransactions = useCallback(async () => {
    if (!viewingWallet || loadingMoreTransactions || !hasMoreTransactions) return;
    setLoadingMoreTransactions(true);
    try {
      const from = txPageRef.current * TX_PAGE_SIZE;
      const page = await fetchTransactionsPage(viewingWallet, from);
      setTransactions((prev) => {
        const map = new Map(prev.map((r) => [r.tx_hash, r]));
        page.forEach((r) => map.set(r.tx_hash, r));
        return Array.from(map.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      });
      setHasMoreTransactions(page.length === TX_PAGE_SIZE);
      txPageRef.current += 1;
    } catch (err) {
      console.error("usePublicProfileData: failed to load more transactions", err);
    } finally {
      setLoadingMoreTransactions(false);
    }
  }, [viewingWallet, loadingMoreTransactions, hasMoreTransactions]);

  const toggleFollow = useCallback(async () => {
    if (!connectedWallet || !viewingWallet || isOwnProfile || followBusy) return;
    setFollowBusy(true);
    const nextState = !isFollowing;
    // Optimistic update — revert on failure.
    setIsFollowing(nextState);
    setFollowCounts((prev) => ({ ...prev, followers: Math.max(0, prev.followers + (nextState ? 1 : -1)) }));
    try {
      await setFollowState(connectedWallet, viewingWallet, nextState);
    } catch (err) {
      console.error("usePublicProfileData: failed to update follow state", err);
      setIsFollowing(!nextState);
      setFollowCounts((prev) => ({ ...prev, followers: Math.max(0, prev.followers + (nextState ? -1 : 1)) }));
    } finally {
      setFollowBusy(false);
    }
  }, [connectedWallet, viewingWallet, isOwnProfile, isFollowing, followBusy]);

  return {
    user,
    createdTokens,
    portfolio,
    transactions,
    hasMoreTransactions,
    loadingMoreTransactions,
    loadMoreTransactions,
    followCounts,
    isFollowing,
    followBusy,
    toggleFollow,
    isOwnProfile,
    loading,
    error,
    refresh: loadAll,
  };
}

export default usePublicProfileData;
