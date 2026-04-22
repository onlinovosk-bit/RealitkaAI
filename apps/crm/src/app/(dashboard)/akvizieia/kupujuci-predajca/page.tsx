import { RealEstateArbitrage } from "@/components/marketing/AcquisitionHub";

export const metadata = { title: "Kupujúci = Predajca – Revolis.AI" };

export default function KupujuciPredajcaPage() {
  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white mb-1">Kupujúci = Predajca</h1>
        <p className="text-sm" style={{ color: "#64748B" }}>
          Každý kupujúci má potenciálne čo predať. AI prechádza vaše kontakty a identifikuje tých, kde jedna obhliadka môže priniesť dva mandáty.
        </p>
      </div>
      <RealEstateArbitrage />
    </div>
  );
}
