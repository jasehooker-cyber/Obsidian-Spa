let cached: { siteUrl: string } | null = null;

export function getEnv() {
  if (!cached) {
    cached = {
      siteUrl:
        process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    };
  }
  return cached;
}
