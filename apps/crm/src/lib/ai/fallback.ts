/**
 * Deterministic Fallback System
 * Maklér NIKDY nečaká dlhšie ako 500ms na AI odpoveď.
 * Ak Claude neodpovie včas — dostane deterministický fallback okamžite.
 */

import type { SalesBrainInsight } from "./sales-brain";
import type { CallAnalysisResult } from "./call-analysis";
import type { CoachFeedback } from "./call-coach";

/**
 * Races `promise` against a timeout.
 * - Timeout wins  → returns `fallback` (never throws)
 * - Promise wins  → returns its resolved value
 * - Promise rejects → returns `fallback`
 */
export function withAiTimeout<T>(
  promise: Promise<T>,
  fallback: T,
  ms = 500
): Promise<T> {
  const timeout = new Promise<T>((resolve) => {
    const id = setTimeout(() => resolve(fallback), ms);
    // Allow Node.js to exit even if this timer is still pending
    if (typeof id === "object" && "unref" in id) id.unref();
  });

  return Promise.race([
    promise.catch(() => fallback),
    timeout,
  ]);
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
