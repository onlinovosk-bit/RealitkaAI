import { okResponse, errorResponse } from "@/lib/api-response";

/**
 * Uloženie cieľov z onboarding úvodu (GoalCards).
 * Telo: { goals: string[] }
 */
export async function POST(request: Request) {
  try {
    await request.json().catch(() => ({}));
    return okResponse({ saved: true });
  } catch {
    return errorResponse("Neplatný request.", 400);
  }
}
