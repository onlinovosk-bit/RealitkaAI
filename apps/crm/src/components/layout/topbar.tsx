"use client";
import AuthButton from "@/components/auth/auth-button";
import MobileNav from "@/components/layout/mobile-nav";
import { type UserRole } from "@/lib/navigation";

export default function Topbar({
  userName,
  role,
}: {
  userName: string;
  role: UserRole;
}) {
  const roleLabel = role === "owner" ? "Majiteľ" : "Maklér";

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        <MobileNav role={role} />
        <div>
          <h2 className="text-base font-semibold text-gray-900 md:text-lg">Revolis.AI</h2>
          <p className="hidden text-sm text-gray-500 sm:block">{userName}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 sm:inline">
          {roleLabel}
        </span>
        <AuthButton />
      </div>
    </header>
  );
}
