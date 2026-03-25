"use client";
import AuthButton from "@/components/auth/auth-button";

export default function Topbar({ 
  userName,
  role,
}: {
  userName: string;
  role: string;
}) {
  console.log('=== TOPBAR RENDER ===', { userName, role, time: new Date().toISOString() });
  const roleLabel =
    role === "owner" ? "Vlastník" : role === "manager" ? "Manažér" : "Maklér";

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Realitka AI</h2>
        <p className="text-sm text-gray-500">Prihlásený používateľ: {userName}</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
          {roleLabel}
        </span>
        <AuthButton />
      </div>
    </header>
  );
}
