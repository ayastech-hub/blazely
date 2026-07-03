import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Hammer, Loader2 } from "lucide-react";

export function MaintenanceGuard({ children }) {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("site_config")
      .select("value")
      .eq("key", "maintenance_mode")
      .single()
      .then(({ data }) => {
        setIsMaintenance(data?.value ?? false);
        setLoading(false);
      });

    const channel = supabase
      .channel("maintenance_channel")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "site_config", filter: "key=eq.maintenance_mode" }, (payload) => setIsMaintenance(payload.new.value))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030712]">
        <Loader2 className="w-8 h-8 text-[#96d6cd] animate-spin" />
      </div>
    );
  }

  if (isMaintenance) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#030712] p-6 font-mono text-center">
        <div className="max-w-md w-full border border-[#1e293b] bg-[#0b0f19] p-8 rounded-lg shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-[#96d6cd]/10 rounded-full">
              <Hammer className="w-10 h-10 text-[#96d6cd]" strokeWidth={1.5} />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold uppercase tracking-[0.2em] text-white mb-2">
            Under Maintenance
          </h1>
          
          <div className="w-12 h-0.5 bg-[#96d6cd] mx-auto mb-6" />
          
          <p className="text-[#64748B] text-sm leading-relaxed mb-8">
            We're currently upgrading the infrastructure. Trading is paused to ensure data integrity. 
            We'll be back online momentarily.
          </p>

          <div className="flex justify-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#96d6cd] animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest text-[#96d6cd]">Status: Offline</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
