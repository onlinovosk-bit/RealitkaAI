import { StealthRecruiter } from "@/components/marketing/AcquisitionHub";

export const metadata = { title: "Zachrán Samopredajcu – Revolis.AI" };

export default function ZachranSamopredajcuPage() {
  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white mb-1">Zachrán Samopredajcu</h1>
        <p className="text-sm" style={{ color: "#64748B" }}>
          Samopredajcovia, ktorí 3 mesiace znižujú cenu — sú vaši najlepší potenciálni klienti. AI ich nájde, ohodnotí a napíše správu presne v správny moment.
        </p>
      </div>
      <StealthRecruiter />
    </div>
  );
}
