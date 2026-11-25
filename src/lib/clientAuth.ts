/**
 * Client-side Firebase authentication token and Authorization header helpers.
 */

export async function getFirebaseIdToken(expectedUserId?: string): Promise<string | null> {
  try {
    const { auth } = await import("@/lib/firebase");
    const currentUser = auth?.currentUser;
    if (!currentUser) return null;
    if (expectedUserId && currentUser.uid !== expectedUserId) {
      return null;
    }
    return (await currentUser.getIdToken()) || null;
  } catch {
    return null;
  }
}

export async function getFirebaseAuthHeaders(options?: {
  expectedUserId?: string;
  json?: boolean;
}): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (options?.json !== false) {
    headers["Content-Type"] = "application/json";
  }
  const token = await getFirebaseIdToken(options?.expectedUserId);
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}
