import { NextResponse }          from "next/server";
import { createClient }          from "@/lib/supabase/server";
import { generateDailyActions }  from "@/lib/daily-actions";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: leads, error } = await supabase
      .from("leads")
      .select("id, name, status, last_contact_at, created_at")
      .neq("status", "Archivovaný")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    const actions = generateDailyActions(leads ?? []);
    return NextResponse.json({ actions });
  } catch (err) {
    console.error("[daily-actions]", err);
    return NextResponse.json({ error: "Interná chyba." }, { status: 500 });
  }
}
