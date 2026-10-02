/**
 * Čisté rozhodnutia o schránkach príjmu — bez I/O, aby sa dali testovať a aby ich
 * mohol používať route aj Gmail pull bez duplikovania pravidla.
 */

export type MailboxRow = { email: string; profile_id: string | null };

/** Prečo mail nemá priradeného makléra. `null` = má (alebo nie je čo logovať). */
export type MailboxLogEvent = "to_missing" | "to_agency_mailbox" | "to_unmatched";

/**
 * Tri rôzne stavy, ktoré sa predtým logovali ako jeden `to_unmatched`:
 * - `to_missing` — Worker neposlal `to`,
 * - `to_agency_mailbox` — adresa v tabuľke JE, ale patrí celej agentúre (`profile_id` NULL),
 *   čo je normálny stav, nie chyba,
 * - `to_unmatched` — adresa v `inbound_mailboxes` nie je, alebo je profil mimo agentúry.
 */
export function mailboxLogEvent(input: {
  mailbox: string | null;
  rowFound: boolean;
  hasOwner: boolean;
}): MailboxLogEvent | null {
  if (!input.mailbox) return "to_missing";
  if (input.hasOwner) return null;
  return input.rowFound ? "to_agency_mailbox" : "to_unmatched";
}

/**
 * Schránka, z ktorej Gmail pull posiela `to`. Pull nevie, komu mail patrí, takže smie
 * použiť len adresu celej agentúry — maklérska by priradila všetky leady jednému
 * maklérovi. Viac agentúrnych adries → deterministicky abecedne prvá.
 * Žiadna agentúrna → null (radšej chyba `mailbox_not_found` než náhodný makléř).
 */
export function pickAgencyMailbox(rows: readonly MailboxRow[]): string | null {
  const emails = rows
    .filter((r) => r.profile_id == null && typeof r.email === "string" && r.email.length > 0)
    .map((r) => r.email)
    .sort();
  return emails[0] ?? null;
}
