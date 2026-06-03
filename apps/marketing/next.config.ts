import type { NextConfig } from 'next'

const ZAKULISIE_DEFAULT = '/zakulisie/l99'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/demo', destination: ZAKULISIE_DEFAULT, permanent: true },
      { source: '/demo/:path*', destination: ZAKULISIE_DEFAULT, permanent: true },
      { source: '/landing', destination: ZAKULISIE_DEFAULT, permanent: true },
      { source: '/landing/:path*', destination: ZAKULISIE_DEFAULT, permanent: true },
    ]
  },
}

export default nextConfig
