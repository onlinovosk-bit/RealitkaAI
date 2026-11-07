"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackListingClicked } from "@/lib/sprievodca/analytics";
import { getOrCreateSprievodcaSessionId } from "@/lib/sprievodca/session-id";

type Props = {
  agencySlug: string;
  listingPosition: number;
  href: string;
  propertyId: string;
  intentId?: string;
  className?: string;
  children: ReactNode;
};

export function ListingClickTracker({
  agencySlug,
  listingPosition,
  href,
  propertyId,
  intentId,
  className,
  children,
}: Props) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        trackListingClicked(
          agencySlug,
          getOrCreateSprievodcaSessionId(),
          listingPosition,
        );
        if (!intentId) return;
        void fetch("/api/public/property-view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intentId, propertyId }),
          keepalive: true,
        }).catch(() => undefined);
      }}
    >
      {children}
    </Link>
  );
}
