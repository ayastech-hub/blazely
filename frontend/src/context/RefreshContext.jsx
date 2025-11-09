//RefreshContext.jsx
import React, { createContext, useContext, useState } from "react";

/**
 * Global refresh tick — call triggerRefresh() after any local action (buy/sell/stake/lock)
 * to force components to re-fetch.
 */
const RefreshContext = createContext();

export function RefreshProvider({ children }){
  const [tick, setTick] = useState(0);
  const triggerRefresh = ()=> setTick(t => t + 1);
  return <RefreshContext.Provider value={{ tick, triggerRefresh }}>{children}</RefreshContext.Provider>;
}

export function useRefresh(){ return useContext(RefreshContext); }
