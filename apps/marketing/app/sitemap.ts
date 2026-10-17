import type { MetadataRoute } from 'next'
import { PUBLIC_SITEMAP_PATHS, marketingUrl } from '../lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_SITEMAP_PATHS.map((path) => ({
    url: marketingUrl(path),
  }))
}
