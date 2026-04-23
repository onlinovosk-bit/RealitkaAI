const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		// Tree-shake veľké balíky — menej JS na klientovi (ikonky, motion).
		optimizePackageImports: ["lucide-react", "framer-motion"],
	},
	async redirects() {
		return [
			{ source: "/demo-odhad", destination: "/demo", permanent: true },
			{ source: "/l99-scan",   destination: "/demo", permanent: true },
			{ source: "/home",       destination: "/landing", permanent: true },
		];
	},
};

module.exports = nextConfig;
