// src/components/PortfolioAssetsContainer.jsx
import React, { useState, useMemo } from "react";
import PortfolioAssetsTab from "./PortfolioAssetsTab";

const PortfolioAssetsContainer = ({
  portfolio = [],
  loading = false,
  DashboardCard,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const tokens = Array.isArray(portfolio) ? portfolio : [];

  const filteredTokens = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return tokens.filter(
      (t) => t.name?.toLowerCase().includes(q) || t.symbol?.toLowerCase().includes(q)
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
