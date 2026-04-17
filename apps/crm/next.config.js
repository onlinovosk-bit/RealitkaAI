const path = require("path");

/** Monorepo root (npm workspaces hoist `next` here). `outputFileTracingRoot` and `turbopack.root` must match. */
const monorepoRoot = path.join(__dirname, "..", "..");

/** @type {import('next').NextConfig} */
const nextConfig = {
	outputFileTracingRoot: monorepoRoot,
	turbopack: {
		root: monorepoRoot,
	},
	experimental: {
		// Tree-shake veľké balíky — menej JS na klientovi (ikonky, motion).
		optimizePackageImports: ["lucide-react", "framer-motion"],
	},
};

module.exports = nextConfig;
