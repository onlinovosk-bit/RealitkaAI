import { notFound } from "next/navigation";
import { Award, ShieldCheck, Target, Timer } from "lucide-react";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";

type BrokerMetrics = {
  response_time_avg?: number;
  deals_closed?: number;
  bri_accuracy?: number;
};

type BrokerProfile = {
  slug: string;
  display_name: string | null;
  agency_name: string | null;
  verified_badge: boolean;
  plan_tier: "market_vision" | "authority";
  metrics: BrokerMetrics | null;
};

function metricValue(value: unknown, fallback: string): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
}

function MetricBox({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
      <div className="mb-1 flex justify-center text-yellow-500">{icon}</div>
      <div className="text-xs font-black italic">{value}</div>
      <div className="text-[8px] uppercase tracking-widest text-slate-500">{label}</div>
    </div>
  );
}

export default async function PublicBrokerProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("broker_profiles")
    .select("slug,display_name,agency_name,verified_badge,plan_tier,metrics")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const broker = data as BrokerProfile;
  const metrics = broker.metrics ?? {};
  const responseTime = metricValue(metrics.response_time_avg, "0");
  const dealsClosed = metricValue(metrics.deals_closed, "0");
  const briAccuracy = metricValue(metrics.bri_accuracy, "0");
  const trustScore = broker.plan_tier === "authority" ? "9.8/10" : "8.4/10";

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.revolis.ai";
  const profileUrl = `${baseUrl}/makleri/${broker.slug}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(profileUrl)}`;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#010103] p-4 text-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-yellow-600/10 to-transparent" />

      <div className="w-full max-w-md rounded-[3rem] bg-gradient-to-br from-yellow-500 via-yellow-200 to-yellow-700 p-[2px] shadow-[0_0_80px_rgba(234,179,8,0.2)]">
        <div className="relative overflow-hidden rounded-[3rem] bg-[#0a0a0b] p-8 text-center backdrop-blur-3xl">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-yellow-400/20 blur-xl" />
              <ShieldCheck size={64} className="relative z-10 text-yellow-500" />
            </div>
          </div>

          <h1 className="mb-1 text-2xl font-black italic tracking-tighter">CERTIFIED BY REVOLIS.AI</h1>
          <p className="mb-2 text-sm font-bold text-white">
            {broker.display_name || broker.slug}
          </p>
          <p className="mb-8 text-[10px] font-bold uppercase tracking-[0.4em] text-yellow-500/60">
            Verified Reputation Protocol
          </p>

          <div className="mb-8 grid grid-cols-2 gap-4">
            <MetricBox icon={<Timer size={16} />} label="Response" value={`${responseTime} min`} />
            <MetricBox icon={<Award size={16} />} label="Closed Deals" value={dealsClosed} />
            <MetricBox icon={<Target size={16} />} label="BRI Accuracy" value={`${briAccuracy}%`} />
            <MetricBox icon={<ShieldCheck size={16} />} label="Trust Score" value={trustScore} />
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/5 p-6">
            <img
              src={qrUrl}
              alt="QR"
              className="mx-auto mb-4 rounded-lg grayscale transition-all hover:grayscale-0"
            />
            <p className="text-[9px] font-black uppercase text-slate-500">Scan to verify credentials</p>
          </div>
        </div>
      </div>
    </div>
  );
}
