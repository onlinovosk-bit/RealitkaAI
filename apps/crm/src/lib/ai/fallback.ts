/**
 * Deterministic Fallback System
 * Maklér NIKDY nečaká dlhšie ako 500ms na AI odpoveď.
 * Ak Claude neodpovie včas — dostane deterministický fallback okamžite.
 */

import type { SalesBrainInsight } from "./sales-brain";
import type { CallAnalysisResult } from "./call-analysis";
import type { CoachFeedback } from "./call-coach";
import { classifyAiError, reportAiFailure, type AiFailure } from "./ai-failure";

export interface WithAiTimeoutOptions {
  /** Názov funkcie do logu (`AI_CALL_FAILED`), napr. `dashboard_insights`. */
  feature?: string;
  /** Zavolá sa presne raz pri zlyhaní (timeout alebo odmietnutie), pred návratom zálohy. */
  onFailure?: (failure: AiFailure) => void;
}

/**
 * Races `promise` against a timeout.
 * - Timeout wins  → returns `fallback` (never throws)
 * - Promise wins  → returns its resolved value
 * - Promise rejects → returns `fallback`
 *
 * Každé zlyhanie sa zaloguje ako `AI_CALL_FAILED` (`warn`) s kódom dôvodu, HTTP statusom
 * a request-id — nikdy s textom chyby. Ticho prehltnuté odmietnutie bolo presne dôvod,
 * prečo sa výpadok AI po 22. 9. nedal zistiť. Ak chyba príde až po vypršaní okna,
 * zaloguje sa tiež (`after_timeout: true`): ukáže skutočnú príčinu pomalého zlyhania.
 */
export function withAiTimeout<T>(
  promise: Promise<T>,
  fallback: T,
  ms = 500,
  opts: WithAiTimeoutOptions = {},
): Promise<T> {
  const feature = opts.feature ?? "unlabeled";
  const startedAt = Date.now();
  let settled = false;
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const fail = (failure: AiFailure) => {
    reportAiFailure(feature, failure, { elapsedMs: Date.now() - startedAt });
    try {
      opts.onFailure?.(failure);
    } catch {
      // Diagnostika nesmie zmeniť výsledok volania.
    }
  };

  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      if (settled) return;
      timedOut = true;
      fail({ reason: "timeout", httpStatus: null, errorType: null, errorName: null, requestId: null });
      resolve(fallback);
    }, ms);
    // Allow Node.js to exit even if this timer is still pending
    if (typeof timer === "object" && "unref" in timer) timer.unref();
  });

  const guarded = promise.then(
    (value) => {
      settled = true;
      clearTimeout(timer);
      return value;
    },
    (err: unknown) => {
      settled = true;
      clearTimeout(timer);
      // Po timeoute už `onFailure` bežalo (s `timeout`); pozdné odmietnutie ide len do logu.
      if (timedOut) {
        reportAiFailure(feature, classifyAiError(err), {
          elapsedMs: Date.now() - startedAt,
          afterTimeout: true,
        });
      } else {
        fail(classifyAiError(err));
      }
      return fallback;
    },
  );

  return Promise.race([guarded, timeout]);
}

// ---------------------------------------------------------------------------
// SalesBrain fallback — score-based, deterministický
// ---------------------------------------------------------------------------

export function salesBrainFallback(score: number): SalesBrainInsight {
  if (score >= 75) {
    return {
      headline:        "Horúci lead — konaj ihneď",
      reasoning:       `Skóre ${score}/100 naznačuje vysoký záujem — prioritný kontakt dnes.`,
      confidence:      "low",
      data_points:     [`Skóre: ${score}/100`, "Lokálna analýza bez AI", "Overif manuálne"],
      priority:        "high",
      suggestedAction: "Zavolaj dnes, nie zajtra.",
    };
  }

  if (score >= 45) {
    return {
      headline:        "Lead si vyžaduje pozornosť",
      reasoning:       `Skóre ${score}/100 — stredný záujem, vhodný čas na kontakt.`,
      confidence:      "low",
      data_points:     [`Skóre: ${score}/100`, "Lokálna analýza bez AI", "Overif manuálne"],
      priority:        "medium",
      suggestedAction: "Pošli stručnú správu so zaujímavosťou.",
    };
  }

  return {
    headline:        "Lead zatiaľ neaktívny",
    reasoning:       `Skóre ${score}/100 — nízky záujem, nurturing fáza.`,
    confidence:      "low",
    data_points:     [`Skóre: ${score}/100`, "Lokálna analýza bez AI", "Overif manuálne"],
    priority:        "low",
    suggestedAction: "Zaraď do nurturingovej sekvencie.",
  };
}

// ---------------------------------------------------------------------------
// CallAnalysis fallback — neutrálny, nespôsobuje paniku
// ---------------------------------------------------------------------------

export function callAnalysisFallback(): CallAnalysisResult {
  return {
    sentiment:           "inconclusive",
    sentiment_arc:       "FLAT",
    analysis_confidence: "low",
    inconclusive_reason: "AI analýza nedostupná — výsledok nie je k dispozícii.",
    keyTopics:           [],
    objections:          [],
    buying_signals:      [],
    nextAction:          "Skontroluj prepis manuálne a urob záver sám.",
    score:               50,
    summary:             "Analýza hovoru nebola dokončená — AI neodpovedala včas.",
    escalation_needed:   false,
  };
}

// ---------------------------------------------------------------------------
// CallCoach fallback — žiadna penalizácia, čistý stav
// ---------------------------------------------------------------------------

export function callCoachFallback(): CoachFeedback {
  return {
    score:            50,
    strengths:        ["Hovor prebehol — to je základ."],
    improvements:     ["AI coaching dočasne nedostupný — skús znova neskôr."],
    tip:              "Zaznamenaj si kľúčové momenty hovoru kým ich máš v pamäti.",
    next_suggestions: [],
  };
}
