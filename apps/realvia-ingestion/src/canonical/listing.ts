// Vendor-agnostic canonical listing model.
// All vendor adapters MUST normalize to this shape before writing to Postgres.
// Adding a new vendor = implement VendorAdapter<YourRawType> — no changes here.

export type ListingStatus = 'active' | 'reserved' | 'sold' | 'withdrawn'
export type ListingType   = 'apartment' | 'house' | 'land' | 'commercial' | 'other'
export type MediaType     = 'photo' | 'floorplan' | 'video'

export interface CanonicalMedia {
  vendorUrl: string
  mediaType: MediaType
  sortOrder: number
}

export interface CanonicalLocation {
  country: string
  region?: string
  city: string
  district?: string
  street?: string
  lat?: number
  lon?: number
}

export interface CanonicalListing {
  vendorListingId: string
  title: string
  description?: string
  listingType: ListingType
  status: ListingStatus
  price: number
  currency: string
  areaM2?: number
  rooms?: number
  floor?: number
  location: CanonicalLocation
  media: CanonicalMedia[]
  attributes: Record<string, unknown>  // vendor-specific extras, preserved verbatim
  rawHash: string                       // SHA-256 of the raw payload string
}

// What the diff engine reads from Postgres to compare against
export interface StoredListing {
  id: string
  vendorListingId: string
  status: ListingStatus
  price: number
  rawHash: string
  consecutiveMisses: number
}
