import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "Email a heslo sú povinné." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
    }

    return NextResponse.json({ ok: true, user: data.user, session: data.session });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Chyba pri prihlasovaní." }, { status: 500 });
  }
}
