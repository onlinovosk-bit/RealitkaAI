import { okResponse, errorResponse } from "@/lib/api-response";
import { runCoreSchemaValidation } from "@/lib/schema-validation";

export async function GET() {
  try {
    const result = await runCoreSchemaValidation();
    return okResponse(result);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Schema validation zlyhala.",
      500
    );
  }
}
