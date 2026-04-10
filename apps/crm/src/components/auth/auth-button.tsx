"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AuthButton() {
  // alert('AuthButton render'); // Removed to prevent server-side ReferenceError
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = supabaseClient;
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setLoading(false);
    };

    getUser();


    const { data: listener } = supabase.auth.onAuthStateChange((
      _event: string,
      session: { user: any } | null
    ) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="text-sm text-gray-500">
        Načítavam...
      </div>
    );
  }

  if (!user) {
    return (
      <button
        onClick={() => router.push("/login")}
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
      >
        Prihlásiť sa
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600">
        {user.email}
      </span>

      <button
        onClick={handleLogout}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-100"
      >
        Odhlásiť sa
      </button>
    </div>
  );
}
