import { hydrateOutcomesFromDisk } from "./learning-store";
import { loadWeightsFromDisk } from "./weights";

let done = false;

/** Volaj na vstupe do Node API workeru (raz). */
export function ensureLearningDataLoaded(): void {
  if (done) return;
  loadWeightsFromDisk();
  hydrateOutcomesFromDisk();
  done = true;
}
