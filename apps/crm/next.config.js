/** @type {import('next').NextConfig} */
const nextConfig = {
	outputFileTracingRoot: __dirname,
	experimental: {
		// Tree-shake veľké balíky — menej JS na klientovi (ikonky, motion).
		optimizePackageImports: ["lucide-react", "framer-motion"],
	},
};

module.exports = nextConfig;
