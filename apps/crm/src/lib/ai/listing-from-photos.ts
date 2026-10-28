import { buildListingUserPrompt, sanitizePropertyInput } from "./listing-content";
import { SYSTEM_PROMPT } from "./listing-content-system-prompt";
import type { ListingContent, ListingPersona, PropertyInput } from "./listing-content";
import {
  LISTING_VISION_MEDIA_TYPES,
  type ListingVisionMediaType,
  type ListingVisionPhoto,
  type ListingVisionProvider,
} from "./listing-vision-provider";

export const LISTING_FROM_PHOTOS_MAX = 6;
export const LISTING_FROM_PHOTOS_MAX_BYTES = 4 * 1024 * 1024;

export type ListingPhotoRequest =
  | { type: "data_url"; dataUrl: string }
  | { type: "url"; url: string };

export type PhotoValidationOk = { ok: true; photos: ListingVisionPhoto[] };
export type PhotoValidationErr = { ok: false; error: string };
export type PhotoValidationResult = PhotoValidationOk | PhotoValidationErr;

const DATA_URL_RE =
  /^data:(image\/jpeg|image\/png|image\/webp|image\/gif);base64,([A-Za-z0-9+/]+={0,2})$/i;

export const PHOTO_FACT_RULES = `FOTKY (ďalší zdroj faktov, nie náhrada parametrov):
- Použi len to, čo je na fotografii jasne viditeľné (svetlo, podlaha, kuchyňa, balkón, stav stien).
- Parameter vyhráva nad fotkou. Ak si odporujú, parameter ostane v texte a rozpor daj do missingData.
- Nevymýšľaj izby, výmery, materiály ani vybavenie, ktoré nie sú na fotke ani v parametroch.
- Neidentifikuj osoby. Ignoruj tváre, mená na zvončekoch, EČV a dokumenty v zábere.
- Fotka nie je dôkaz lokality ani „tichého sídliska“. Charakter lokality len z poľa charakterLokality.`;

export function extractPropertyImageUrls(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  const out: string[] = [];
  for (const item of images) {
    if (typeof item === "string" && /^https?:\/\//i.test(item.trim())) {
      out.push(item.trim());
      continue;
    }
    if (item && typeof item === "object" && "url" in item) {
      const url = String((item as { url: unknown }).url ?? "").trim();
      if (/^https?:\/\//i.test(url)) out.push(url);
    }
  }
  return out;
}

export function isBlockedPhotoHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1" || host === "[::1]") {
    return true;
  }
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  return false;
}

function base64ByteLength(b64: string): number {
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

function asMediaType(value: string): ListingVisionMediaType | null {
  const lower = value.toLowerCase() as ListingVisionMediaType;
  return (LISTING_VISION_MEDIA_TYPES as readonly string[]).includes(lower) ? lower : null;
}

export function validatePhotoRequests(input: unknown): PhotoValidationResult {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, error: "Pridajte aspoň jednu fotografiu." };
  }
  if (input.length > LISTING_FROM_PHOTOS_MAX) {
    return { ok: false, error: `Najviac ${LISTING_FROM_PHOTOS_MAX} fotografií na jeden úkon.` };
  }

  const photos: ListingVisionPhoto[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: "Neplatný formát fotografie." };
    }
    const rec = raw as { type?: unknown; dataUrl?: unknown; url?: unknown };
    if (rec.type === "data_url" && typeof rec.dataUrl === "string") {
      const match = rec.dataUrl.trim().match(DATA_URL_RE);
      if (!match) {
        return { ok: false, error: "Fotografia musí byť JPEG, PNG, WebP alebo GIF (data URL)." };
      }
      const mediaType = asMediaType(match[1]);
      const data = match[2];
      if (!mediaType || !data) {
        return { ok: false, error: "Nepodporovaný typ fotografie." };
      }
      if (base64ByteLength(data) > LISTING_FROM_PHOTOS_MAX_BYTES) {
        return { ok: false, error: "Jedna fotografia môže mať najviac 4 MB." };
      }
      photos.push({ source: "base64", mediaType, data });
      continue;
    }
    if (rec.type === "url" && typeof rec.url === "string") {
      let parsed: URL;
      try {
        parsed = new URL(rec.url.trim());
      } catch {
        return { ok: false, error: "URL fotografie nie je platná." };
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { ok: false, error: "URL fotografie musí byť http(s)." };
      }
      if (isBlockedPhotoHost(parsed.hostname)) {
        return { ok: false, error: "URL fotografie nie je povolená." };
      }
      photos.push({ source: "url", url: parsed.toString() });
      continue;
    }
    return { ok: false, error: "Fotografia musí byť data URL alebo overená URL nehnuteľnosti." };
  }
  return { ok: true, photos };
}

export function assertTenantPhotoUrls(
  photos: ListingVisionPhoto[],
  allowedUrls: string[],
): { ok: true } | { ok: false; error: string } {
  const allowed = new Set(allowedUrls);
  for (const photo of photos) {
    if (photo.source !== "url") continue;
    if (!allowed.has(photo.url)) {
      return { ok: false, error: "URL fotografie nepatrí tejto nehnuteľnosti." };
    }
  }
  return { ok: true };
}

export function buildListingFromPhotosUserPrompt(
  property: PropertyInput,
  persona: ListingPersona,
): string {
  return `${buildListingUserPrompt(sanitizePropertyInput(property), persona)}

${PHOTO_FACT_RULES}`;
}

export async function generateListingContentFromPhotos(
  input: {
    property: PropertyInput;
    persona?: ListingPersona;
    photos: ListingVisionPhoto[];
  },
  provider: ListingVisionProvider,
): Promise<{ content: ListingContent; audit: import("./listing-content").ListingContentAudit }> {
  const persona = input.persona ?? "GENERAL";
  const property = sanitizePropertyInput(input.property);
  return provider.generate({
    property,
    persona,
    photos: input.photos,
    userPrompt: buildListingFromPhotosUserPrompt(property, persona),
    systemPrompt: SYSTEM_PROMPT,
  });
}
