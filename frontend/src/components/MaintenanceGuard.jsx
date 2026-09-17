import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Hammer } from "lucide-react";
import Loading from "./ui/Loading";
import { GLASS } from "./ui/GlassCard";
import BackgroundGlow from "./BackgroundGlow";

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
      <div className="relative min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <BackgroundGlow />
        <Loading label={null} size="lg" />
      </div>
    );
  }

  if (isMaintenance) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] p-6 font-mono text-center">
        <BackgroundGlow />
        <div className={`relative max-w-md w-full p-8 rounded-2xl ${GLASS}`}>
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-[var(--teal)]/10 rounded-full">
              <Hammer className="w-10 h-10 text-[var(--teal)]" strokeWidth={1.5} />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold uppercase tracking-[0.2em] text-[var(--text-bright)] mb-2">
            Under Maintenance
          </h1>
          
          <div className="w-12 h-0.5 bg-[var(--teal)] mx-auto mb-6" />
          
          <p className="text-[var(--text-faint-2)] text-sm leading-relaxed mb-8">
            We're currently upgrading the infrastructure. Trading is paused to ensure data integrity. 
            We'll be back online momentarily.
          </p>

          <div className="flex justify-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--teal)] animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest text-[var(--teal)]">Status: Offline</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
