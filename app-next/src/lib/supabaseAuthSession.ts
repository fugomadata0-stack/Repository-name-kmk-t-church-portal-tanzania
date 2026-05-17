import { getCachedAuthUserId, requireAuthUserId } from "./authSessionCache";

/**
 * Kitambulisho cha mtumiaji kutoka cache ya kikao (hakuna ombi la auth).
 * PortalContext inasasisha cache kupitia onAuthStateChange.
 */
export function getCurrentUserId(): string | null {
  return getCachedAuthUserId();
}

export { requireAuthUserId };
