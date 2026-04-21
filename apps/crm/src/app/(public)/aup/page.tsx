import LegalPageShell from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "Pravidlá používania (AUP) – Revolis.AI",
  description: "Acceptable Use Policy – pravidlá pre používanie Revolis.AI",
};

export default function AupPage() {
  return (
    <LegalPageShell
      title="Pravidlá používania"
      subtitle="Acceptable Use Policy · Verzia 1.0 · Účinnosť od: 21. apríla 2026"
    >
      <div className="space-y-6 text-sm text-slate-400">
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Povolené používanie</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Správa leadov a nehnuteľností pre vlastnú realitnú kanceláriu</li>
            <li>Komunikácia s klientmi v súlade s GDPR</li>
            <li>Exporty dát pre interné reporty</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Zakázané aktivity</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Spam a nevyžiadané hromadné správy</li>
            <li>Harvesting kontaktov tretích strán bez súhlasu</li>
            <li>Reverse engineering AI logiky a modelov</li>
            <li>Ďalší predaj prístupu bez písomného súhlasu</li>
            <li>Akékoľvek aktivity porušujúce platné právne predpisy SR/EÚ</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Porušenie</h2>
          <p>
            Pri porušení AUP si vyhradzujeme právo pozastaviť alebo ukončiť prístup bez
            predchádzajúceho upozornenia. Reportovanie zneužitia:{" "}
            <a href="mailto:abuse@revolis.ai" className="text-cyan-400">
              abuse@revolis.ai
            </a>
          </p>
        </section>
      </div>
    </LegalPageShell>
  );
}
