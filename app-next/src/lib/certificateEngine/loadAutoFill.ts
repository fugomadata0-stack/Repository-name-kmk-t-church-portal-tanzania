import type { DayosisiRecord, JimboRecord, LeadershipCvBundle, TawiRecord } from "../../types";
import { fetchLeadershipCvBundle, signLeadershipCvPath } from "../../services/leadershipCvEngineService";
import {
  fetchLeadershipProfileExtendedOptional,
  fetchLeadershipRoleCatalogOptional,
  type LeadershipProfileExtendedRow,
  type LeadershipRoleCatalogRow,
} from "../../services/leadershipCredentialsEngineService";
import type { UnifiedLeaderRef } from "./types";
import {
  autoFillLeaderRef,
  buildChurchLeaderAutoFill,
  buildNationalLeaderAutoFill,
  type LeadershipCredentialAutoFill,
} from "./autoFill";

async function urlToDataUrl(url: string): Promise<string | null> {
  const u = String(url ?? "").trim();
  if (!u) return null;
  try {
    const res = await fetch(u, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => reject(new Error("read"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function resolveChurchMedia(
  leaderPhotoUrl: string | null,
  leaderSigUrl: string | null,
  bundle: LeadershipCvBundle | null,
): Promise<{ photoDataUrl: string | null; signatureDataUrl: string | null }> {
  const prof = bundle?.profile;
  const photoPath = prof?.profile_photo_storage_path?.trim();
  const sigPath = prof?.signature_storage_path?.trim();
  const [signedPhoto, signedSig] = await Promise.all([
    photoPath ? signLeadershipCvPath(photoPath) : null,
    sigPath ? signLeadershipCvPath(sigPath) : null,
  ]);
  const [photoDataUrl, signatureDataUrl] = await Promise.all([
    signedPhoto ? urlToDataUrl(signedPhoto) : leaderPhotoUrl ? urlToDataUrl(leaderPhotoUrl) : null,
    signedSig ? urlToDataUrl(signedSig) : leaderSigUrl ? urlToDataUrl(leaderSigUrl) : null,
  ]);
  return { photoDataUrl, signatureDataUrl };
}

export type LoadAutoFillInput = {
  ref: UnifiedLeaderRef;
  dayosisi?: DayosisiRecord[];
  majimbo?: JimboRecord[];
  matawi?: TawiRecord[];
  logoUrl?: string | null;
  roleCatalog?: LeadershipRoleCatalogRow[];
};

let roleCatalogCache: LeadershipRoleCatalogRow[] | null = null;
let roleCatalogLoadedAt = 0;
const CATALOG_TTL_MS = 5 * 60 * 1000;

async function getRoleCatalog(prefetched?: LeadershipRoleCatalogRow[]): Promise<LeadershipRoleCatalogRow[]> {
  if (prefetched?.length) return prefetched;
  const now = Date.now();
  if (roleCatalogCache && now - roleCatalogLoadedAt < CATALOG_TTL_MS) return roleCatalogCache;
  roleCatalogCache = await fetchLeadershipRoleCatalogOptional();
  roleCatalogLoadedAt = now;
  return roleCatalogCache;
}

/** Pakia data kutoka DB + CV Engine, jaza maeneo mengi kiotomatiki. */
export async function loadLeadershipCredentialAutoFill(
  input: LoadAutoFillInput,
): Promise<LeadershipCredentialAutoFill> {
  const catalog = await getRoleCatalog(input.roleCatalog);
  const baseCtx = {
    dayosisi: input.dayosisi,
    majimbo: input.majimbo,
    matawi: input.matawi,
    roleCatalog: catalog,
    logoUrl: input.logoUrl ?? null,
  };

  if (input.ref.source === "national_leadership") {
    const row = input.ref.row;
    const [photoDataUrl, signatureDataUrl] = await Promise.all([
      row.profile_photo_url?.trim() ? urlToDataUrl(row.profile_photo_url) : null,
      row.signature_url?.trim() ? urlToDataUrl(row.signature_url) : null,
    ]);
    return buildNationalLeaderAutoFill(row, {
      ...baseCtx,
      photoDataUrl,
      signatureDataUrl,
    });
  }

  const leader = input.ref.leader;
  const [extended, bundle] = await Promise.all([
    fetchLeadershipProfileExtendedOptional(leader.id),
    fetchLeadershipCvBundle(leader.id),
  ]);

  const media = await resolveChurchMedia(
    leader.photo_url?.trim() || null,
    leader.signature_url?.trim() || null,
    bundle,
  );

  return buildChurchLeaderAutoFill(leader, {
    ...baseCtx,
    extended: extended as LeadershipProfileExtendedRow | null,
    cvBundle: bundle,
    ...media,
  });
}

/** Rebuild bila fetch (wakati data tayari ipo). */
export function rebuildAutoFillFromContext(
  ref: UnifiedLeaderRef,
  ctx: Parameters<typeof autoFillLeaderRef>[1],
): LeadershipCredentialAutoFill {
  if (ref.source === "national_leadership") {
    return buildNationalLeaderAutoFill(ref.row, ctx);
  }
  return buildChurchLeaderAutoFill(ref.leader, ctx);
}
