/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict routing — all routes must have a page.tsx
  // No trailing slash needed
  trailingSlash: false,

  // Experimental features
  experimental: {
    typedRoutes: true,
  },
}

module.exports = nextConfig
