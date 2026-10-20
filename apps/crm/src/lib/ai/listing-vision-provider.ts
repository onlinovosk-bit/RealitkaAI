import type { ListingContent, ListingContentAudit, ListingPersona, PropertyInput } from "./listing-content";

export const LISTING_VISION_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type ListingVisionMediaType = (typeof LISTING_VISION_MEDIA_TYPES)[number];

export type ListingVisionPhoto =
  | { source: "base64"; mediaType: ListingVisionMediaType; data: string }
  | { source: "url"; mediaType?: ListingVisionMediaType; url: string };

export type ListingVisionInput = {
  property: PropertyInput;
  persona: ListingPersona;
  photos: ListingVisionPhoto[];
  userPrompt: string;
  systemPrompt: string;
};

export class ListingVisionProviderError extends Error {
  constructor(
    message: string,
    readonly code: "missing_key" | "provider_failed",
  ) {
    super(message);
    this.name = "ListingVisionProviderError";
  }
}

export type ListingVisionProvider = {
  id: string;
  generate(input: ListingVisionInput): Promise<{ content: ListingContent; audit: ListingContentAudit }>;
};

export function createMockListingVisionProvider(
  fixture: ListingContent,
  audit?: Partial<ListingContentAudit>,
): ListingVisionProvider {
  return {
    id: "mock",
    async generate() {
      return {
        content: fixture,
        audit: {
          model: "mock-listing-vision",
          costEur: 0,
          latencyMs: 0,
          inputTokens: 0,
          outputTokens: 0,
          cacheCreationInputTokens: 0,
          cacheReadInputTokens: 0,
          ...audit,
        },
      };
    },
  };
}
