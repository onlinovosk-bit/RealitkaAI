import type { NextRequest } from "next/server";
import { logError, logWarn } from "@/lib/logger";
import { resolveAgencyIdFromRealsoftCredentials } from "@/lib/realsoft/auth";
import {
  UcListingMapperValidationError,
  mapUcListingPayload,
} from "@/lib/uc/mapper-listing";
import {
  UcMapperValidationError,
  mapUcAgentPayload,
} from "@/lib/uc/mapper-agent";
import {
  extractUcExternalId,
  isUcDeleteRequest,
  parseUcIncomingPayload,
} from "@/lib/uc/payload";
import {
  persistUcAgent,
  persistUcListing,
  softDeleteUcAgent,
  softDeleteUcListing,
  storeUcImportLog,
} from "@/lib/uc/persist";
import {
  ucAgentAdded,
  ucAgentDeleted,
  ucAgentEdited,
  ucInternalError,
  ucMissingData,
  ucObjectAdded,
  ucObjectDeleted,
  ucObjectEdited,
  ucNotFound,
  ucWrongData,
  ucWrongLogin,
} from "@/lib/uc/responses";
import { isRecord } from "@/lib/uc/shared";

async function parseIncoming(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  let raw: Record<string, unknown> | null = null;

  if (contentType.includes("application/json")) {
    const json = (await request.json()) as unknown;
    if (!isRecord(json)) return null;
    raw = json;
  } else {
    const form = await request.formData();
    raw = Object.fromEntries(form.entries());
  }

  return parseUcIncomingPayload(raw);
}

function validationResponse(err: UcMapperValidationError | UcListingMapperValidationError) {
  return ucWrongData({ [err.field]: err.message });
}

export async function handleUcImportPost(request: NextRequest, serviceName: string) {
  try {
    const payload = await parseIncoming(request);
    if (!payload) return ucMissingData("Missing required fields: user, pass, action, data");

    const auth = await resolveAgencyIdFromRealsoftCredentials(payload.user, payload.pass);
    if (!auth.ok) {
      if (auth.reason === "invalid_credentials") return ucWrongLogin();
      return ucInternalError("Auth backend unavailable");
    }

    const data = payload.data;
    const externalId = extractUcExternalId(payload.action, data);

    if (isUcDeleteRequest(data)) {
      if (!externalId) return ucWrongData({ deleted: "Missing object_id/user_id for delete" });

      const deleteResult =
        payload.action === 1
          ? await softDeleteUcListing(auth.agencyId, externalId)
          : await softDeleteUcAgent(auth.agencyId, externalId);

      if (!deleteResult.ok) {
        logError(`[${serviceName}] delete failed`, { error: deleteResult.error });
        return ucInternalError("Failed to delete import entity");
      }

      await storeUcImportLog({
        agencyId: auth.agencyId,
        action: payload.action,
        externalId,
        rawPayload: payload,
        unmapped: null,
        resultCode: deleteResult.resultCode,
        entityId: deleteResult.entityId || null,
      });

      if (deleteResult.resultCode === 4) {
        return ucNotFound(payload.action === 1 ? "object" : "agent");
      }

      return payload.action === 1 ? ucObjectDeleted() : ucAgentDeleted();
    }

    let unmapped: Record<string, unknown> = {};
    let resultCode = 1;
    let entityId: string | null = null;

    if (payload.action === 2) {
      const mapped = mapUcAgentPayload(data);
      unmapped = mapped.raw;
      const persistResult = await persistUcAgent(auth.agencyId, mapped);
      if (!persistResult.ok) {
        logError(`[${serviceName}] agent persist failed`, { error: persistResult.error });
        return ucInternalError("Failed to persist agent");
      }
      resultCode = persistResult.resultCode;
      entityId = persistResult.entityId;
    } else {
      const mapped = mapUcListingPayload(data);
      unmapped = mapped.raw;
      const persistResult = await persistUcListing(auth.agencyId, mapped);
      if (!persistResult.ok) {
        logError(`[${serviceName}] listing persist failed`, { error: persistResult.error });
        return ucInternalError("Failed to persist listing");
      }
      resultCode = persistResult.resultCode;
      entityId = persistResult.entityId;
    }

    const logResult = await storeUcImportLog({
      agencyId: auth.agencyId,
      action: payload.action,
      externalId,
      rawPayload: payload,
      unmapped,
      resultCode,
      entityId,
    });

    if (!logResult.ok) {
      logWarn(`[${serviceName}] import log persist failed`, { error: logResult.error });
    }

    if (payload.action === 2) {
      return resultCode === 1
        ? ucAgentAdded(externalId ?? undefined)
        : ucAgentEdited(externalId ?? undefined);
    }

    return resultCode === 1
      ? ucObjectAdded(externalId ?? undefined)
      : ucObjectEdited(externalId ?? undefined);
  } catch (err) {
    if (err instanceof UcMapperValidationError || err instanceof UcListingMapperValidationError) {
      return validationResponse(err);
    }

    logWarn(`[${serviceName}] unhandled error`, {
      error: err instanceof Error ? err.message : String(err),
    });
    return ucInternalError();
  }
}

export function ucImportHealth(serviceName: string) {
  return {
    status: "ok",
    service: serviceName,
    timestamp: new Date().toISOString(),
  };
}
