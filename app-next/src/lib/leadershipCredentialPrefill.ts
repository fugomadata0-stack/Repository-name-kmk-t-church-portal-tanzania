/** Handoff: Cheti & CV Hub → CV Engine (kiongozi aliyechaguliwa). */
const KEY = "kmkt_leadership_credential_prefill_v1";

export type LeadershipCredentialPrefill = {
  leaderId: string;
  fullName?: string;
  cheo?: string;
  at?: number;
};

export function writeLeadershipCredentialPrefill(p: LeadershipCredentialPrefill): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...p, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function readLeadershipCredentialPrefill(): LeadershipCredentialPrefill | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as LeadershipCredentialPrefill;
    if (!o?.leaderId?.trim()) return null;
    if (Date.now() - (o.at ?? 0) > 30 * 60 * 1000) {
      clearLeadershipCredentialPrefill();
      return null;
    }
    return o;
  } catch {
    return null;
  }
}

export function clearLeadershipCredentialPrefill(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
