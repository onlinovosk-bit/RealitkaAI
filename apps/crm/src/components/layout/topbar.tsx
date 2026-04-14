"use client";
import AuthButton from "@/components/auth/auth-button";
import { AppModeToggle } from "@/components/layout/app-mode-toggle";
import MobileNav from "@/components/layout/mobile-nav";
import { type UserRole } from "@/lib/navigation";
import { AI_ASSISTANT_STATUS_ONLINE } from "@/lib/ai-brand";

export default function Topbar({
  userName,
  role,
}: {
  userName: string;
  role: UserRole;
}) {
  const roleLabel = role === "owner" ? "Majiteľ" : "Maklér";

  return (
    <header
      className="flex h-16 items-center justify-between px-4 md:px-6"
      style={{
        background: '#080D1A',
        borderBottom: '1px solid #0F1F3D',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <MobileNav role={role} />
        <div>
          <h2 className="text-base font-semibold md:text-lg" style={{ color: '#F0F9FF' }}>
            Revolis.AI
          </h2>
          <p className="hidden text-xs sm:block" style={{ color: '#475569' }}>
            {userName}
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <AppModeToggle />

        <span
          className="hidden rounded-full px-3 py-1 text-xs font-semibold sm:inline"
          style={{
            background: 'rgba(34,211,238,0.10)',
            border: '1px solid rgba(34,211,238,0.25)',
            color: '#67E8F9',
          }}
        >
          {roleLabel}
        </span>

        <div
          className="hidden items-center gap-2 rounded-full px-3 py-1 sm:flex"
          style={{
            background: 'rgba(34,211,238,0.06)',
            border: '1px solid rgba(34,211,238,0.15)',
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full animate-pulse"
            style={{ background: '#22D3EE', boxShadow: '0 0 6px rgba(34,211,238,0.9)' }}
          />
          <span className="text-xs" style={{ color: '#22D3EE' }}>
            {AI_ASSISTANT_STATUS_ONLINE}
          </span>
        </div>

        <AuthButton />
      </div>
    </header>
  );
}
