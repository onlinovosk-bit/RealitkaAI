"use client";

import { usePathname } from "next/navigation";
import BlogPromoTicker from "./BlogPromoTicker";

/** Skryje spodný blog pás na vybraných verejných stránkach (napr. registrácia). */
export default function BlogPromoTickerGate() {
  const pathname = usePathname();
  if (pathname === "/register" || pathname?.startsWith("/register/")) {
    return null;
  }
  return <BlogPromoTicker />;
}
