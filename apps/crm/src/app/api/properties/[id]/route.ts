import { okResponse, errorResponse } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { deleteProperty, getProperty, updateProperty } from "@/lib/properties-store";
import { createActivity } from "@/lib/activities-store";
import { autoRecalculateForProperty } from "@/lib/matching-hooks";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  try {
    const { id } = await params;
    if (!UUID_RE.test(id)) return errorResponse("Invalid ID", 400);
    const body = await request.json();
    const [oldProperty, { data: callerProfile }] = await Promise.all([
      getProperty(id),
      supabase.from("profiles").select("agency_id").eq("id", user.id).maybeSingle(),
    ]);

    if (callerProfile?.agency_id && oldProperty?.agencyId && oldProperty.agencyId !== callerProfile.agency_id) {
      return errorResponse("Forbidden", 403);
    }

    const property = await updateProperty(id, {
      title:       body.title,
      location:    body.location,
      price:       typeof body.price === "number" ? body.price : undefined,
      type:        body.type,
      rooms:       body.rooms,
      features:    Array.isArray(body.features) ? body.features : undefined,
      status:      body.status,
      description: body.description,
      ownerName:   body.ownerName,
      ownerPhone:  body.ownerPhone,
      // agencyId is intentionally NOT accepted from body — prevents cross-tenant reassignment
    });

    try {
      await createActivity({
        leadId: null,
        type: "Nehnuteľnosť",
        title: "Upravená nehnuteľnosť",
        text: `Nehnuteľnosť "${oldProperty?.title ?? id}" bola upravená.`,
        entityType: "property",
        entityId: id,
        actorName: "Systém",
        source: "inventory",
        severity: "info",
      });
    } catch {}

    await autoRecalculateForProperty(id);
    return okResponse({ property });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Nepodarilo sa upraviť nehnuteľnosť.",
      400
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  try {
    const { id } = await params;
    if (!UUID_RE.test(id)) return errorResponse("Invalid ID", 400);
    const [oldProperty, { data: callerProfile }] = await Promise.all([
      getProperty(id),
      supabase.from("profiles").select("agency_id").eq("id", user.id).maybeSingle(),
    ]);

    if (callerProfile?.agency_id && oldProperty?.agencyId && oldProperty.agencyId !== callerProfile.agency_id) {
      return errorResponse("Forbidden", 403);
    }

    await deleteProperty(id);

    try {
      await createActivity({
        leadId: null,
        type: "Nehnuteľnosť",
        title: "Zmazaná nehnuteľnosť",
        text: `Nehnuteľnosť "${oldProperty?.title ?? id}" bola zmazaná.`,
        entityType: "property",
        entityId: id,
        actorName: "Systém",
        source: "inventory",
        severity: "warning",
      });
    } catch {}

    return okResponse({ deletedId: id });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Nepodarilo sa zmazať nehnuteľnosť.",
      400
    );
  }
}
