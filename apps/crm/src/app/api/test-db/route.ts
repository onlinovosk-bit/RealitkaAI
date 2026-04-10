import { getProperties } from "@/lib/mockDb";

export async function GET() {
  try {
    return Response.json({
      success: true,
      data: getProperties(),
    });
  } catch (e) {
    return Response.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
