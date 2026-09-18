/**
 * DEPRECATED / COMPATIBILITY ADAPTER
 * Legacy Cloudflare KV Cache adapter - now redirected to unified Upstash Redis CacheService.
 * Kept to ensure zero breaking changes during migration verification.
 */
import { cacheService } from "@/lib/cache";

export const kvCache = cacheService;
export default kvCache;
