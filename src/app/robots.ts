import type { MetadataRoute } from "next";
import { getEnv } from "@/lib/config/env-public";

export default function robots(): MetadataRoute.Robots {
  const base = getEnv().siteUrl;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // "/admin/" is deliberately absent: listing it here would tell anyone
      // who reads robots.txt exactly where to look. The admin area is hidden
      // by src/proxy.ts and carries a noindex tag, which keeps it out of
      // search results without publishing its address.
      disallow: ["/api/", "/intake/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
