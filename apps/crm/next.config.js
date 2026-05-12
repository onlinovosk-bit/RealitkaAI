const path = require("path");

/** @type {import('next').NextConfig} */
// P0.5 — build-time guard: never ship with E2E auth bypass in production
if (process.env.NODE_ENV === 'production' && process.env.E2E_BYPASS_AUTH === '1') {
  throw new Error('FATAL: E2E_BYPASS_AUTH=1 is set in production. Remove this env var immediately.');
}

const nextConfig = {
	outputFileTracingRoot: path.join(__dirname, "../.."),
	experimental: {
		// Tree-shake veľké balíky — menej JS na klientovi (ikonky, motion).
		optimizePackageImports: ["lucide-react", "framer-motion"],
	},
	async redirects() {
		return [
			{ source: "/demo-odhad", destination: "/demo", permanent: true },
			{ source: "/l99-scan",   destination: "/demo", permanent: true },
			{ source: "/home",       destination: "/landing", permanent: true },
			{ source: "/team/permissions", destination: "/dashboard/reputation/integrity", permanent: true },
			{ source: "/dashboard/revolis-ai", destination: "/revolis-ai", permanent: true },
			{
				source: "/admin/integrations/realvia",
				destination: "/integrations/realvia",
				permanent: true,
			},
		];
	},
};

module.exports = nextConfig;
