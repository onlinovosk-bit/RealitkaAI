"use client";

import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();


  async function handleLogout() {
    await supabaseClient.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      Odhlásiť sa
    </button>
  );
}