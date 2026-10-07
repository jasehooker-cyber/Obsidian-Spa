import { getEnv } from "@/lib/config/env-public";

/**
 * Stable JSON-LD id for the spa's DaySpa entity (defined in the root layout),
 * so other pages can name it as a provider instead of repeating it.
 */
export function spaEntityId(): string {
  return `${getEnv().siteUrl}/#spa`;
}
