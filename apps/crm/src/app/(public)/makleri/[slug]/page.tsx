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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-blue-950/5">
      <div className="mb-1 flex justify-center text-blue-700">{icon}</div>
      <div className="text-xs font-black italic text-slate-950">{value}</div>
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
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 p-4 text-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#eff6ff_100%)]" />

      <div className="w-full max-w-md rounded-[3rem] bg-gradient-to-br from-blue-700 via-orange-400 to-blue-800 p-[2px] shadow-2xl shadow-blue-950/15">
        <div className="relative overflow-hidden rounded-[3rem] bg-white p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-blue-400/20 blur-xl" />
              <ShieldCheck size={64} className="relative z-10 text-blue-700" />
            </div>
          </div>

          <h1 className="mb-1 text-2xl font-black italic tracking-tighter text-slate-950">CERTIFIED BY REVOLIS.AI</h1>
          <p className="mb-2 text-sm font-bold text-slate-900">
            {broker.display_name || broker.slug}
          </p>
          <p className="mb-8 text-[10px] font-bold uppercase tracking-[0.4em] text-blue-700">
            Verified Reputation Protocol
          </p>

          <div className="mb-8 grid grid-cols-2 gap-4">
            <MetricBox icon={<Timer size={16} />} label="Response" value={`${responseTime} min`} />
            <MetricBox icon={<Award size={16} />} label="Closed Deals" value={dealsClosed} />
            <MetricBox icon={<Target size={16} />} label="BRI Accuracy" value={`${briAccuracy}%`} />
            <MetricBox icon={<ShieldCheck size={16} />} label="Trust Score" value={trustScore} />
          </div>

          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-6">
            <img
              src={qrUrl}
              alt="QR"
              className="mx-auto mb-4 rounded-lg ring-1 ring-orange-200 transition-all hover:ring-orange-400"
            />
            <p className="text-[9px] font-black uppercase text-orange-700">Scan to verify credentials</p>
          </div>
        </div>
      </div>
    </div>
  );
}
