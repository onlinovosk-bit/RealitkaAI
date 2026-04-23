import { AIGhostwriter } from "@/components/marketing/AcquisitionHub";

export const metadata = { title: "Listy z Katastra – Revolis.AI" };

export default function ListyZKastraPage() {
  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white mb-1">Listy z Katastra</h1>
        <p className="text-sm" style={{ color: "#64748B" }}>
          Dedičstvo, plomba, zmena vlastníka — AI vygeneruje profesionálny list majiteľovi skôr, ako sa dozvie konkurencia. Prvý kontakt rozhoduje o mandáte.
        </p>
      </div>
      <AIGhostwriter />
    </div>
  );
}
