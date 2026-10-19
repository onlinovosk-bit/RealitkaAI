import path from 'path'
import type { NextConfig } from 'next'

const ZAKULISIE_DEFAULT = '/zakulisie/l99'

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, '../crm/src'),
    }
    return config
  },
  // Root `/` servíruje statický `public/index.html` (kampaň cenník v3, 2026-10-19).
  // Rollback: zmazať tento rewrite — `/` sa vráti na App Router landing (`app/page.tsx`).
  async rewrites() {
    return {
      beforeFiles: [{ source: '/', destination: '/index.html' }],
      afterFiles: [],
      fallback: [],
    }
  },
  async redirects() {
    return [
      { source: '/demo/:path+', destination: ZAKULISIE_DEFAULT, permanent: true },
      { source: '/landing', destination: ZAKULISIE_DEFAULT, permanent: true },
      { source: '/landing/:path*', destination: ZAKULISIE_DEFAULT, permanent: true },
    ]
  },
}

export default nextConfig
