import React, { useState, useMemo } from "react";
// Ensure this import path is correct based on where PortfolioAssetsTab.jsx is located
import PortfolioAssetsTab from "./PortfolioAssetsTab";

const PortfolioAssetsContainer = ({
  portfolio = [],
  loading,
  DashboardCard,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Ensure portfolio is always an array (good defensive practice)
  const tokens = Array.isArray(portfolio) ? portfolio : [];

  // Filter search logic using useMemo for performance
  const filteredTokens = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return tokens.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) || t.symbol?.toLowerCase().includes(q)
    );
  }, [tokens, searchTerm]);

  return (
    <PortfolioAssetsTab
      data={filteredTokens}
      loading={loading}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      DashboardCard={DashboardCard}
    />
  );
};

export default PortfolioAssetsContainer;
