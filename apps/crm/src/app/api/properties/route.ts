import { okResponse, errorResponse } from "@/lib/api-response";
import { createProperty } from "@/lib/properties-store";
import { createActivity } from "@/lib/activities-store";
import { autoRecalculateForProperty } from "@/lib/matching-hooks";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const property = await createProperty({
      agencyId: body.agencyId ?? null,
      title: body.title ?? "",
      location: body.location ?? "",
      price: Number(body.price ?? 0),
      type: body.type ?? "Byt",
      rooms: body.rooms ?? "2 izby",
      features: Array.isArray(body.features) ? body.features : [],
      status: body.status ?? "Aktívna",
      description: body.description ?? "",
      ownerName: body.ownerName ?? "",
      ownerPhone: body.ownerPhone ?? "",
    });

    try {
      await createActivity({
        leadId: null,
        type: "Nehnuteľnosť",
        title: "Vytvorená nehnuteľnosť",
        text: `Bola vytvorená nová nehnuteľnosť: ${property.title}.`,
        entityType: "property",
        entityId: property.id,
        actorName: "Systém",
        source: "inventory",
        severity: "info",
      });
    } catch {}

    await autoRecalculateForProperty(property.id);

    return okResponse({ property });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Nepodarilo sa vytvoriť nehnuteľnosť.",
      400
    );
  }
}
