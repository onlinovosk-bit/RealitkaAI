"use client";

import { useEffect, useState } from "react";

/**
 * The "…, ktorú hľadáte, nebola nájdená." sentence on the 404 card, naming the
 * address the visitor actually asked for.
 *
 * Two earlier attempts got this wrong, both by naming an address that was not
 * the requested one:
 *
 *   1. The path was hardcoded as `app.revolis.ai/team/permissions`, so every
 *      visitor was told that was what they had looked for.
 *   2. It was read with `usePathname()`. On a 404 that returns the INTERNAL
 *      route name — production rendered `app.revolis.ai/_not-found` for a
 *      request to /overujem-404-path-fix-abc123. Next.js sets the router's
 *      segment path to `_not-found`, and `app/not-found.tsx` is a server
 *      component prerendered as /404, so neither the server render nor the
 *      router knows the requested URL.
 *
 * `window.location.pathname` is the only thing that does know it, and it is
 * readable only after mount. Until then the sentence simply does not name an
 * address, which is the point: saying nothing beats naming the wrong page.
 */
export function NotFoundPath({ codeStyle }: { codeStyle?: React.CSSProperties }) {
  const [pathname, setPathname] = useState<string | null>(null);

  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);

  if (!pathname) {
    return <>Stránka, ktorú hľadáte, nebola nájdená.</>;
  }

  return (
    <>
      Adresa <code style={codeStyle}>app.revolis.ai{pathname}</code>, ktorú
      hľadáte, nebola nájdená.
    </>
  );
}
