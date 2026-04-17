import { LegalCallout, LegalSection } from "@/components/legal/legal-doc-blocks";

export default function IndemnificationDocument() {
  return (
    <LegalSection id="indemnification" eyebrow="Dokument 5" title="DOLOŽKA O ODŠKODNENÍ (INDEMNIFICATION)">
      <p>Táto doložka definuje povinnosti odškodnenia medzi stranami a je neoddeliteľnou súčasťou MSA.</p>

      <h3 className="text-lg font-semibold text-white">Článok 1 — Odškodnenie Poskytovateľom</h3>
      <p>
        Poskytovateľ sa zaväzuje odškodniť, brániť a chrániť Klienta pred nárokmi tretích strán vyplývajúcimi z:
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Porušenia práv duševného vlastníctva tretích strán Platformou (pokiaľ Klient Platformu nemodifikoval)</li>
        <li>Hrubej nedbanlivosti alebo úmyselného pochybenia Poskytovateľa</li>
        <li>Porušenia povinností Poskytovateľa ako Spracovateľa podľa GDPR</li>
      </ul>
      <p>
        Podmienkou odškodnenia je: (i) bezodkladné písomné oznámenie nároku Poskytovateľovi, (ii) poskytnutie výhradnej
        kontroly nad obranou a vyrovnaním, (iii) primeraná súčinnosť Klienta.
      </p>

      <h3 className="text-lg font-semibold text-white">Článok 2 — Odškodnenie Klientom</h3>
      <p>Klient sa zaväzuje odškodniť Poskytovateľa pred nárokmi vyplývajúcimi z:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Porušenia Podmienok používania alebo Zmluvy Klientom</li>
        <li>Nesprávneho alebo neoprávneného použitia Platformy</li>
        <li>Porušenia práv tretích strán Zákazníckymi dátami</li>
        <li>Pokusov o reverse engineering alebo neoprávnený prístup k systémom</li>
        <li>Zverejnenia dôverných informácií tretím stranám</li>
        <li>Nedodržania GDPR v postavení Prevádzkovateľa (napr. chýbajúci súhlas dotknutých osôb)</li>
      </ul>

      <h3 className="text-lg font-semibold text-white">Článok 3 — Obmedzenie zodpovednosti</h3>
      <LegalCallout variant="warn" title="Maximálna zodpovednosť">
        <p>
          Celková kumulatívna zodpovednosť Poskytovateľa voči Klientovi je obmedzená na sumu poplatkov zaplatených Klientom za
          posledných 12 mesiacov predchádzajúcich udalosti zakladajúcej nárok.
        </p>
      </LegalCallout>
      <p>
        Strany sa výslovne dohodli, že ani jedna strana nezodpovedá za: (i) nepriame škody (indirect damages), (ii) stratu
        zisku, (iii) stratu obchodnej príležitosti, (iv) stratu dobrého mena, (v) náklady na náhradné riešenia, (vi) škody
        spôsobené rozhodnutiami prijatými na základe odporúčaní AI systému.
      </p>
      <p>
        Výnimky z obmedzenia zodpovednosti (tieto nie sú obmedzené): (i) úmyselné pochybenie alebo hrubá nedbalosť, (ii)
        porušenie práv duševného vlastníctva, (iii) porušenie povinností GDPR, (iv) smrť alebo ublíženie na zdraví.
      </p>
    </LegalSection>
  );
}
