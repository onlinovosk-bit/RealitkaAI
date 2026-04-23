const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
	outputFileTracingRoot: path.resolve(__dirname, "../.."),
	experimental: {
		// Tree-shake veľké balíky — menej JS na klientovi (ikonky, motion).
		optimizePackageImports: ["lucide-react", "framer-motion"],
	},
	turbopack: {
		root: path.resolve(__dirname, "../.."),
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
