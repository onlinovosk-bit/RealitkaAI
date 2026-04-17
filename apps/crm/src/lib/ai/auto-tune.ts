import { getDataset } from "./learning-store";
import { WEIGHTS, saveWeightsToDisk } from "./weights";

const MIN_SAMPLES = 8;

/**
 * Jednoduchá heuristika: úspešnosť signálu → posun váhy.
 * Nie je to ML; stačí na postupné prispôsobenie bez infra.
 */
export function autoTuneWeights(): {
  tuned: boolean;
  samples: number;
  detail?: string;
} {
  const data = getDataset();
  if (data.length < MIN_SAMPLES) {
    return {
      tuned: false,
      samples: data.length,
      detail: `need_at_least_${MIN_SAMPLES}_outcomes`,
    };
  }

  const successSignals: Record<string, number> = {};
  const totalSignals: Record<string, number> = {};

  for (const item of data) {
    const keys = Object.keys(item.signals || {});
    for (const key of keys) {
      totalSignals[key] = (totalSignals[key] ?? 0) + 1;
      if (item.converted) {
        successSignals[key] = (successSignals[key] ?? 0) + 1;
      }
    }
  }

  for (const key of Object.keys(WEIGHTS)) {
    const total = totalSignals[key] ?? 0;
    if (total === 0) continue;
    const successRate = (successSignals[key] ?? 0) / total;
    /** Posun v okolí 1.0: konverzie zvyšujú váhu. */
    const next = WEIGHTS[key] * (0.85 + successRate * 0.3);
    WEIGHTS[key] = Math.min(2, Math.max(0.15, parseFloat(next.toFixed(3))));
  }

  saveWeightsToDisk();

  return { tuned: true, samples: data.length };
}
