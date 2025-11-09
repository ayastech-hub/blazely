//useTransactions.js
import { useEffect, useState } from "react";
import { subscribe as wsSubscribe } from "../services/ws";
import { getTxs } from "../services/api";

/**
 * Keeps a list of latest transactions (new items are prepended).
 * Backend should broadcast 'tx' events via WS payload { type, token, amount, from, to, txHash, timestamp }.
 */
export default function useTransactions(maxItems = 500){
  const [txs, setTxs] = useState([]);

  useEffect(() => {
    // initial load from backend
    (async ()=>{
      const hist = await getTxs(80);
      if(hist && Array.isArray(hist)) setTxs(hist);
    })();

    const unsub = wsSubscribe("tx", (payload)=>{
      setTxs(prev => {
        const next = [payload, ...prev];
        if(next.length > maxItems) next.length = maxItems;
        return next;
      });
    });

    return ()=> unsub();
  }, []);

  return txs;
}
