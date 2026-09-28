"use client";

import { useEffect } from "react";
import {
  trackResultsEmpty,
  trackResultsShown,
  trackUnknownSectionShown,
} from "@/lib/sprievodca/analytics";
import { getOrCreateSprievodcaSessionId } from "@/lib/sprievodca/session-id";

type Props = {
  agencySlug: string;
  matchedCount: number;
  unknownCount: number;
  dealType: string;
  propertyType: string;
};

export function NehnutelnostiAnalytics({
  agencySlug,
  matchedCount,
  unknownCount,
  dealType,
  propertyType,
}: Props) {
  useEffect(() => {
    const sessionId = getOrCreateSprievodcaSessionId();
    const resultCount = matchedCount + unknownCount;
    if (resultCount === 0) {
      trackResultsEmpty(agencySlug, sessionId, dealType, propertyType);
    } else {
      trackResultsShown(agencySlug, sessionId, resultCount);
    }
    if (unknownCount > 0) {
      trackUnknownSectionShown(agencySlug, sessionId, unknownCount);
    }
  }, [agencySlug, matchedCount, unknownCount, dealType, propertyType]);

  return null;
}
