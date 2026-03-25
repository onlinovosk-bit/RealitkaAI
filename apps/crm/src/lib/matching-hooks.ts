import { createActivity } from "@/lib/activities-store";
import {
  recalculateAllMatches,
  recalculateMatchesForLead,
  recalculateMatchesForProperty,
} from "@/lib/matching-store";

export async function autoRecalculateForLead(leadId: string) {
  try {
    const result = await recalculateMatchesForLead(leadId);

    try {
      await createActivity({
        leadId,
        type: "Matching",
        title: "Auto prepočet matchingu pre lead",
        text: `Po zmene leadu bol automaticky prepočítaný matching. Zapísaných zhôd: ${result.inserted}.`,
        entityType: "lead",
        entityId: leadId,
        actorName: "Systém",
        source: "matching",
        severity: "info",
        meta: result,
      });
    } catch {}

    return result;
  } catch (error) {
    console.error("autoRecalculateForLead error:", error);
    return null;
  }
}

export async function autoRecalculateForProperty(propertyId: string) {
  try {
    const result = await recalculateMatchesForProperty(propertyId);

    try {
      await createActivity({
        leadId: null,
        type: "Matching",
        title: "Auto prepočet matchingu pre nehnuteľnosť",
        text: `Po zmene nehnuteľnosti bol automaticky prepočítaný matching. Zapísaných zhôd: ${result.inserted}.`,
        entityType: "property",
        entityId: propertyId,
        actorName: "Systém",
        source: "matching",
        severity: "info",
        meta: result,
      });
    } catch {}

    return result;
  } catch (error) {
    console.error("autoRecalculateForProperty error:", error);
    return null;
  }
}

export async function autoRecalculateEverything() {
  try {
    const result = await recalculateAllMatches();

    try {
      await createActivity({
        leadId: null,
        type: "Matching",
        title: "Globálny auto prepočet matchingu",
        text: `Bol spustený globálny prepočet matchingu. Zapísaných zhôd: ${result.totalRows}.`,
        entityType: "matching",
        entityId: "global",
        actorName: "Systém",
        source: "matching",
        severity: "info",
        meta: result,
      });
    } catch {}

    return result;
  } catch (error) {
    console.error("autoRecalculateEverything error:", error);
    return null;
  }
}
