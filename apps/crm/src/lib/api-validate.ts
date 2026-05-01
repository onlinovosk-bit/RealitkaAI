import { z, type ZodSchema } from "zod";
import { NextResponse } from "next/server";

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function validateBody<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      ),
    };
  }

  return { ok: true, data: result.data };
}

export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): ValidationResult<T> {
  const raw = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      ),
    };
  }
  return { ok: true, data: result.data };
}

// ── Common schemas ──────────────────────────────────────────────

export const UUIDSchema = z.string().uuid();
export const EmailSchema = z.string().email();
export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
