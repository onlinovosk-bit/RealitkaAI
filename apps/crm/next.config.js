/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},

  // vypneme custom webpack, ktorý robí konflikt s Next 16
  webpack: undefined
};

module.exports = nextConfig;
