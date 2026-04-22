import { DigitalTwin } from "@/components/marketing/AcquisitionHub";

export const metadata = { title: "Klonovanie Kupujúcich – Revolis.AI" };

export default function KlonovanieKupujucichPage() {
  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white mb-1">Klonovanie Kupujúcich</h1>
        <p className="text-sm" style={{ color: "#64748B" }}>
          AI nájde na Facebooku ľudí, ktorí sa správajú rovnako ako vaši najlepší predajcovia. Koniec drahej reklamy na nesprávne publikum.
        </p>
      </div>
      <DigitalTwin />
    </div>
  );
}
