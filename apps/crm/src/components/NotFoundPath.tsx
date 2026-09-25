"use client";

import { usePathname } from "next/navigation";

/**
 * Renders the address the visitor actually asked for on the 404 card.
 *
 * `app/not-found.tsx` is a server component and Next.js gives it no access to
 * the requested path — it is rendered while `notFound()` unwinds, and the root
 * 404 is prerendered at build time. So the path has to be read on the client.
 *
 * Before this existed the card had `app.revolis.ai/team/permissions` hardcoded
 * and told every visitor that was the address they were looking for, whatever
 * they had actually typed.
 */
export function NotFoundPath({ style }: { style?: React.CSSProperties }) {
  const pathname = usePathname();

  // Server render and the first paint have no pathname; say nothing specific
  // rather than name the wrong address.
  if (!pathname) return <>Stránka</>;

  return <code style={style}>app.revolis.ai{pathname}</code>;
}
