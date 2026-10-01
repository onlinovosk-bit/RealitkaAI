import { after } from "next/server";
import { autoErrorCapture } from "@/lib/auto-error-capture";

/**
 * LEAD-PIPELINE-AFTER — práca, ktorá má dobehnúť PO odoslaní odpovede klientovi.
 *
 * Prečo to vzniklo: verejné trasy (`valuation/submit`, `leads/inbound`, buyer-onboarding) spúšťali
 * AI triáž a auto-odpoveď ako `void fn()` — bez `await`. Na Verceli sa funkcia po odoslaní odpovede
 * zmrazí, takže rozbehnutá práca ticho nedobehla: lead sa uložil, ale nemal `ai_triage_at`, nemal
 * `auto_response_sent_at` a nezanechal ani stopu (log skončil po AI komentári, žiadna chyba).
 * Zachytené testom 2026-10-01 10:14 UTC (viď memory/decisions.md, OUTREACH-DOMAIN-PROOF).
 * Trasa `acquire/email` ich `await`-uje, preto tam fungovali.
 *
 * `after()` z `next/server` drží funkciu nažive, kým callback nedobehne (v rámci `maxDuration`).
 *
 * Kroky bežia PO SEBE, nie súbežne: auto-odpoveď číta `ai_priority`, ktorú zapisuje triáž, a podľa nej
 * volí znenie („ozvem sa dnes" / „v priebehu dňa"). Súbežný beh by ju čítal ešte prázdnu.
 * Pád jedného kroku nezastaví nasledujúce (triáž nesmie zablokovať potvrdenie klientovi) a nikdy
 * nehádže volajúcemu — odpoveď klientovi sa kvôli vedľajšej práci nesmie pokaziť.
 */
export type AfterResponseStep = {
  /** Krátky názov kroku do kontextu chyby, napr. `triage`. */
  name: string;
  run: () => Promise<unknown>;
};

export function runAfterResponse(label: string, steps: AfterResponseStep[]): void {
  const task = async (): Promise<void> => {
    for (const step of steps) {
      try {
        await step.run();
      } catch (error) {
        autoErrorCapture(error, `after-response:${label}:${step.name}`);
      }
    }
  };

  try {
    after(task);
  } catch {
    // Mimo requestu (testy, skripty) `after` hádže. Práca sa spustí rovnako, len bez záruky
    // životnosti — presne ako v lib/inbound/reply-draft.ts.
    void task();
  }
}
