import { NextRequest, NextResponse } from "next/server";
import { logError, logWarn } from "@/lib/logger";
import { resolveAgencyIdFromRealsoftCredentials } from "@/lib/realsoft/auth";
import { RealsoftSampleRequiredError, mapRealsoftPayload } from "@/lib/realsoft/mapper";
import {
  coerceString,
  extractExternalIdFromConfiguredPath,
  isRecord,
  type RealsoftAction,
  type RealsoftRequestPayload,
} from "@/lib/realsoft/payload";
import {
  realsoftInternalError,
  realsoftMissingItems,
  realsoftSuccess,
  realsoftWrongLogin,
} from "@/lib/realsoft/responses";
import { createUniversalImportArtifacts, storeRealsoftImportLog } from "@/lib/realsoft/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function parseIncomingPayload(request: NextRequest): Promise<RealsoftRequestPayload | null> {
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

  const user = coerceString(raw.user);
  const pass = coerceString(raw.pass) ?? coerceString(raw.token);
  const actionRaw = coerceString(raw.action);
  const dataRaw = raw.data;

  if (!user || !pass || !actionRaw || dataRaw == null) return null;
  if (actionRaw !== "1" && actionRaw !== "2") return null;

  let data: unknown = dataRaw;
  if (typeof dataRaw === "string") {
    const trimmed = dataRaw.trim();
    if (!trimmed) return null;
    try {
      data = JSON.parse(trimmed);
    } catch {
      data = dataRaw;
    }
  }

  return {
    user,
    pass,
    action: Number(actionRaw) as RealsoftAction,
    data,
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload = await parseIncomingPayload(request);
    if (!payload) return realsoftMissingItems("Missing required fields: user, pass, action, data");

    const auth = await resolveAgencyIdFromRealsoftCredentials(payload.user, payload.pass);
    if (!auth.ok) {
      if (auth.reason === "invalid_credentials") return realsoftWrongLogin();
      return realsoftInternalError("Auth backend unavailable");
    }

    const externalId = extractExternalIdFromConfiguredPath(payload.action, payload.data);

    let unmapped: Record<string, unknown> | null = null;
    try {
      const mapped = mapRealsoftPayload(payload.action, payload.data);
      unmapped = mapped.unmapped;
    } catch (err) {
      if (err instanceof RealsoftSampleRequiredError) {
        unmapped = {
          todo: err.message,
        };
      } else {
        throw err;
      }
    }

    const storeResult = await storeRealsoftImportLog({
      agencyId: auth.agencyId,
      action: payload.action,
      rawPayload: payload,
      externalId,
      unmapped,
    });

    if (!storeResult.ok) {
      logError("[realsoft-import] failed to persist raw payload", { error: storeResult.error });
      return realsoftInternalError("Failed to persist import payload");
    }

    if (!storeResult.duplicate && storeResult.id) {
      await createUniversalImportArtifacts({
        agencyId: auth.agencyId,
        action: payload.action,
        logId: storeResult.id,
        payload: payload.data,
      });
    }

    return realsoftSuccess(storeResult.duplicate ? "Duplicate acknowledged" : "Import received");
  } catch (err) {
    logWarn("[realsoft-import] unhandled error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return realsoftInternalError();
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "realsoft-import",
    timestamp: new Date().toISOString(),
  });
}

