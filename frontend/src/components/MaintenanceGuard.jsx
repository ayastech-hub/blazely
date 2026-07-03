// src/components/MaintenanceGuard.jsx
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient"; // Import your existing client

export function MaintenanceGuard({ children }) {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial fetch
    supabase
      .from("site_config")
      .select("value")
      .eq("key", "maintenance_mode")
      .single()
      .then(({ data }) => {
        setIsMaintenance(data?.value ?? false);
        setLoading(false);
      });

    // 2. Listen for Realtime updates
    const channel = supabase
      .channel("maintenance_channel")
      .on(
        "postgres_changes", 
        { event: "UPDATE", schema: "public", table: "site_config", filter: "key=eq.maintenance_mode" }, 
        (payload) => setIsMaintenance(payload.new.value)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) return null; // Or a simple spinner while checking status

  if (isMaintenance) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030712] text-white">
        <div className="text-center p-8 space-y-4">
          <h1 className="text-4xl font-black uppercase tracking-widest text-[#96d6cd]">Maintenance</h1>
          <p className="text-slate-400">We are currently updating our systems. Please check back shortly.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
