"use client";

import { usePathname, useRouter } from "next/navigation";

const HIDE_ON = ["/leads/new", "/contacts/new"];

export function MobileFab() {
  const pathname = usePathname();
  const router = useRouter();

  if (!pathname || HIDE_ON.includes(pathname)) return null;

  const handleTap = () => {
    if (pathname.startsWith("/leads")) {
      router.push("/leads/new");
    } else if (pathname.startsWith("/contacts")) {
      router.push("/contacts/new");
    } else {
      router.push("/leads/new");
    }
  };

  return (
    <button
      onClick={handleTap}
      aria-label="Pridať"
      className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all active:scale-90 md:hidden"
      style={{
        background: "linear-gradient(135deg, #22D3EE 0%, #0EA5E9 100%)",
        boxShadow: "0 4px 20px rgba(34,211,238,0.4)",
      }}
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#050914"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  );
}
