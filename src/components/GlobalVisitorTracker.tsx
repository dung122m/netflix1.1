"use client";

/**
 * GlobalVisitorTracker
 * Fires site_visit analytics once per browser tab/session.
 * - Uses sessionStorage key `nanaflix_session_visited` as client-side guard.
 * - Server deduplicates via Redis key `visit_dedup:{viewerKey}` with TTL 1800s.
 * - Waits for Firebase auth state to resolve so identity is correct (User vs Guest).
 * - Does NOT track on every route change or React re-render.
 */

import { useEffect } from "react";
import { trackSiteVisit } from "@/lib/analyticsClient";
import { syncUnifiedDeviceProfile } from "@/lib/deviceProfile";
import { auth } from "@/lib/firebase";

export function GlobalVisitorTracker() {
  useEffect(() => {
    let cancelled = false;

    async function track() {
      // Wait for Firebase auth state to resolve (up to ~3s)
      if (auth) {
        try {
          if (typeof auth.authStateReady === "function") {
            await auth.authStateReady();
          }
        } catch {
          // Ignore: proceed with whatever identity is available
        }
      }

      if (!cancelled) {
        trackSiteVisit();
        syncUnifiedDeviceProfile();
      }
    }

    track();

    // Listen to auth changes to update profile linkage when user logs in
    let unsubscribe: (() => void) | null = null;
    if (auth && typeof auth.onAuthStateChanged === "function") {
      unsubscribe = auth.onAuthStateChanged((currentUser) => {
        if (!cancelled && currentUser) {
          syncUnifiedDeviceProfile(true);
        }
      });
    }

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []); // Empty deps: fires once per mount (once per tab session + sessionStorage guard)

  return null;
}

