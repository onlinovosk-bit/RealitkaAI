"use client";

import { useEffect, type ReactNode } from "react";
import {
  trackSprievodcaStarted,
  trackSprievodcaSubmitted,
} from "@/lib/sprievodca/analytics";
import { getOrCreateSprievodcaSessionId } from "@/lib/sprievodca/session-id";

type Props = {
  agencySlug: string;
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
};

export function SprievodcaFormAnalytics({
  agencySlug,
  action,
  children,
  className,
}: Props) {
  useEffect(() => {
    trackSprievodcaStarted(agencySlug, getOrCreateSprievodcaSessionId());
  }, [agencySlug]);

  return (
    <form
      action={action}
      className={className}
      onSubmit={(event) => {
        const form = event.currentTarget;
        const dealType = String(new FormData(form).get("dealType") ?? "");
        const propertyType = String(new FormData(form).get("propertyType") ?? "");
        trackSprievodcaSubmitted(
          agencySlug,
          getOrCreateSprievodcaSessionId(),
          dealType,
          propertyType,
        );
      }}
    >
      {children}
    </form>
  );
}
