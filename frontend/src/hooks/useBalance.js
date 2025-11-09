//useBalance.js
import { useEffect, useState } from "react";
import { getProfile } from "../services/api";

/**
 * Fetches wallet profile & balances and re-fetches on refreshTick changes.
 * Backend endpoint: GET /api/v1/profile/{wallet}
 */
export default function useBalance(wallet, refreshTick){
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if(!wallet) { setProfile(null); return; }
    (async ()=>{
      const p = await getProfile(wallet);
      if(!cancelled) setProfile(p);
    })();
    return ()=> cancelled = true;
  }, [wallet, refreshTick]);

  return profile;
}
