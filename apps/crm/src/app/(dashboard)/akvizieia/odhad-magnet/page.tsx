import { AiOdhadca } from "@/components/marketing/AcquisitionHub";

export const metadata = { title: "Odhad & Lead Magnet – Revolis.AI" };

export default function OdhadMagnetPage() {
  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white mb-1">Odhad & Lead Magnet</h1>
        <p className="text-sm" style={{ color: "#64748B" }}>
          Zmeňte anonymných návštevníkov na overené kontakty. Každý kto si pýta cenu — je potenciálny predajca.
        </p>
      </div>
      <AiOdhadca />
    </div>
  );
}
