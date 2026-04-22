import { NeighborhoodWatch } from "@/components/marketing/AcquisitionHub";

export const metadata = { title: "Radar Okolia – Revolis.AI" };

export default function RadarOkoliaPage() {
  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white mb-1">Radar Okolia</h1>
        <p className="text-sm" style={{ color: "#64748B" }}>
          Vaši klienti sa dozvedia o pohybe cien skôr, ako to uvidí konkurencia. Udržte ich vo vašom ekosystéme roky pred predajom.
        </p>
      </div>
      <NeighborhoodWatch />
    </div>
  );
}
