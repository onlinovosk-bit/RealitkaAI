import type { MetadataRoute } from "next";
import {
  APP_ROBOTS_ALLOW,
  APP_ROBOTS_DISALLOW,
  APP_SITE_ORIGIN,
} from "@/lib/app-robots";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [...APP_ROBOTS_ALLOW],
      disallow: [...APP_ROBOTS_DISALLOW],
    },
    host: APP_SITE_ORIGIN,
  };
}
