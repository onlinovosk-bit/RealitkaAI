import type { ActivationEmailNode, AgencyActivationSnapshot } from "./types";
import { getAppBaseUrl } from "./flags";

export interface ActivationEmailContent {
  subject: string;
  subjectAlt: string;
  preheader: string;
  body: string;
  ctaUrl: string;
  ctaLabel: string;
}

function links(base: string) {
  return {
    import: `${base}/import/universal`,
    leads: `${base}/leads`,
    settings: `${base}/settings`,
    team: `${base}/team`,
    playbook: `${base}/import/universal?source=nehnutelnosti_sk`,
  };
}

function painDefault(snapshot: AgencyActivationSnapshot): string {
  return snapshot.painMirror || "nevieš, komu volať ako prvému";
}

export function buildActivationEmailContent(
  node: ActivationEmailNode,
  snapshot: AgencyActivationSnapshot,
): ActivationEmailContent {
  const base = getAppBaseUrl();
  const L = links(base);
  const name = snapshot.ownerName || "kolega";
  const pain = painDefault(snapshot);

  switch (node) {
    case "d0":
      return {
        subject: "Tvoj prvý zoznam priorít čaká",
        subjectAlt: "5 minút a vieš, komu volať ako prvému",
        preheader: "Importuj kontakty — zajtra ráno začínaš deň inak.",
        body: `Ahoj ${name},

vitaj v Revolise. Prišiel si, lebo ${pain}.

To sa končí jedným krokom: nahraj kontakty a systém ti ich zoradí podľa pripravenosti kúpiť. Zajtra ráno neotvoríš e-maily — otvoríš zoznam, kde je tvoj najdôležitejší telefonát úplne hore.

Prvá kancelária, ktorá takto funguje — RK z Prešova — má späť zhruba 10 hodín týždenne.

Andy
zakladateľ, Revolis

P.S. Kontakty máš v portáli? Tu je postup exportu z Nehnuteľnosti.sk: ${L.playbook}. Ak sa zasekneš, odpíš na tento e-mail — čítam ich osobne.`,
        ctaUrl: L.import,
        ctaLabel: "Importuj kontakty (5 minút)",
      };

    case "d2_s0":
      return {
        subject: "Najčastejšie to drhne na exporte",
        subjectAlt: "Pošli súbor — importneme ho za teba",
        preheader: "Presný postup exportu z portálu.",
        body: `Ahoj ${name},

vidím, že kontakty ešte nie sú nahrané. Najčastejšie to drhne na exporte z portálu — nie na tebe.

Tu je presný postup: ${L.playbook}

Ak chceš, pošli mi súbor rovno v odpovedi na tento e-mail a importneme ho za teba.

Andy`,
        ctaUrl: L.import,
        ctaLabel: "Otvoriť import",
      };

    case "d2_s1":
      return {
        subject: "Tvoje prvé priority sú pripravené",
        subjectAlt: "Dáta sú dnu — pozri koho volať",
        preheader: "Zoznam podľa pripravenosti kúpy.",
        body: `Ahoj ${name},

kontakty sú v systéme. ${snapshot.scoredLeadCount > 0 ? `Máme ${snapshot.scoredLeadCount} leadov na prácu.` : "Skóre ešte čaká na kvalitnejšie údaje — skontroluj telefón a e-mail u kontaktov."}

Otvor zoznam priorít a zavolaj prvému na vrchu — tam je najväčšia šanca na obchod tento týždeň.

Andy`,
        ctaUrl: L.leads,
        ctaLabel: "Zobraziť priority",
      };

    case "d2_s2":
      return {
        subject: "Ráno o 7:00 ti príde prvý report",
        subjectAlt: "Zapni ranný prehľad jedným klikom",
        preheader: "Koniec triedenia e-mailov pred prvým hovorom.",
        body: `Ahoj ${name},

leady už máš zoradené. Posledný krok: zapni ranný report — každé ráno dostaneš zoznam, komu volať ako prvému.

Bez toho deň začínaš triedením e-mailov namiesto telefonátu top záujemcovi.

Andy`,
        ctaUrl: L.settings,
        ctaLabel: "Zapnúť ranný report",
      };

    case "d5_progress":
      return {
        subject: "Tvoj prvý týždeň v číslach",
        subjectAlt: `${snapshot.scoredLeadCount} leadov — najvyššie skóre ${snapshot.highestScore ?? "—"}`,
        preheader: "Čo systém už spravil za teba.",
        body: `Ahoj ${name},

po prvom týždni: ${snapshot.scoredLeadCount} skórovaných leadov${snapshot.highestScore != null ? `, najvyššie skóre ${snapshot.highestScore}` : ""}.

Ak pracuješ v tíme, pozvi maklérov na zakúpené sedadlá — každý dostane rovnaký ranný prehľad.

Andy`,
        ctaUrl: L.team,
        ctaLabel: "Pozvať maklérov",
      };

    case "d5_founder_draft":
      return {
        subject: `[DRAFT] Founder rescue — ${snapshot.agencyName}`,
        subjectAlt: "[DRAFT] Rizikový účet D5+",
        preheader: "Návrh osobnej správy — schváliť pred odoslaním.",
        body: `DRAFT pre ${snapshot.ownerEmail} (${snapshot.agencyName}):

Ahoj ${name}, vidím, že ste sa nerozbehli — odpíš mi jednou vetou, čo drhne, vyriešime to.

Stav: ${snapshot.hasImport ? "import OK" : "bez importu"}, leadov so skóre: ${snapshot.scoredLeadCount}.`,
        ctaUrl: `mailto:${snapshot.ownerEmail}`,
        ctaLabel: "Odpovedať zákazníkovi",
      };

    case "d7_activated":
      return {
        subject: "Gratulujem — si aktivovaný",
        subjectAlt: "Návyk, ktorý drží výsledky",
        preheader: "Report → prvý telefonát do 9:00.",
        body: `Ahoj ${name},

máš import, skórované leady aj ranný report — to je aktivácia.

Návyk, ktorý drží výsledky: každé ráno report → prvý telefonát do 9:00.

Keď budeš rásť, Owner Cockpit a ďalšie sedadlá nájdeš v nastavení tímu.

Andy`,
        ctaUrl: L.leads,
        ctaLabel: "Otvoriť dnešné priority",
      };

    default: {
      const _exhaustive: never = node;
      throw new Error(`Unknown node: ${String(_exhaustive)}`);
    }
  }
}
