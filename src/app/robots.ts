import type { MetadataRoute } from "next";
import { getEnv } from "@/lib/config/env-public";

export default function robots(): MetadataRoute.Robots {
  const base = getEnv().siteUrl;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/intake/", "/booking/success"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
