"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackListingClicked } from "@/lib/sprievodca/analytics";
import { getOrCreateSprievodcaSessionId } from "@/lib/sprievodca/session-id";

type Props = {
  agencySlug: string;
  listingPosition: number;
  href: string;
  className?: string;
  children: ReactNode;
};

export function ListingClickTracker({
  agencySlug,
  listingPosition,
  href,
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
      }}
    >
      {children}
    </Link>
  );
}
