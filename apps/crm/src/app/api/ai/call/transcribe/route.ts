import { NextResponse } from "next/server";

import { errorResponse, okResponse } from "@/lib/api-response";
import { transcribeCallAudio } from "@/lib/ai/call-transcript";
import {
  checkTranscribeRateLimit,
  validateTranscribeFileSize,
} from "@/lib/call-transcribe-limits";
import { getCurrentProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/leads-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (isSupabaseConfigured() && !profile) {
      return errorResponse("Neautorizovaný prístup.", 401);
    }

    const rl = checkTranscribeRateLimit(request);
    if (!rl.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Príliš veľa požiadaviek na transkripciu. Skúste znova o chvíľu.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSec) },
        }
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!file || !(file instanceof Blob)) {
      return errorResponse("Chýba súbor (pole file).", 400);
    }

    const ab = await file.arrayBuffer();
    const buffer = Buffer.from(ab);

    const sizeCheck = validateTranscribeFileSize(buffer.length);
    if (!sizeCheck.ok) {
      return errorResponse(sizeCheck.message, 413);
    }
    const name = typeof (file as File).name === "string" ? (file as File).name : "call.webm";
    const type = typeof (file as Blob).type === "string" ? file.type : "application/octet-stream";

    const result = await transcribeCallAudio({
      buffer,
      filename: name,
      mimeType: type,
    });

    if ("error" in result) {
      return errorResponse(result.error, 400);
    }

    return okResponse({ text: result.text });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Transkripcia zlyhala.", 400);
  }
}
