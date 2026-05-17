/**
 * Chanzo kimoja cha logo ya kanisa kwa PDF, chapisha, na vyeti.
 * Kipaumbele: church_identity → portal_theme → about_kmkt → site_settings
 */
import type { jsPDF } from "jspdf";
import { fetchUrlAsPdfImageDataUrl } from "./pdfInstitutional";
import { fetchMasterSettingsOptional, readMasterSettingsCache } from "../services/masterSettingsService";
import { fetchChurchIdentityOptional } from "../services/settingsTablesService";
import { getSupabase } from "./supabaseClient";

type LogoCache = { at: number; url: string; dataUrl: string | null };

let logoCache: LogoCache | null = null;
const LOGO_CACHE_MS = 90_000;

async function fetchAboutLogoOptional(): Promise<string | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const res = await client.from("about_kmkt").select("logo_url").limit(1).maybeSingle();
    const url = (res.data as { logo_url?: string } | null)?.logo_url?.trim();
    return url || null;
  } catch {
    return null;
  }
}

async function fetchSiteLogoOptional(): Promise<string | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const res = await client.from("site_settings").select("logo_url").limit(1).maybeSingle();
    const url = (res.data as { logo_url?: string } | null)?.logo_url?.trim();
    return url || null;
  } catch {
    return null;
  }
}

/** URL ya logo iliyowekwa kwenye mipangilio ya kanisa. */
export async function resolveChurchLogoUrl(): Promise<string | null> {
  const [identity, master, about, site] = await Promise.all([
    fetchChurchIdentityOptional().catch(() => null),
    fetchMasterSettingsOptional().catch(() => null),
    fetchAboutLogoOptional(),
    fetchSiteLogoOptional(),
  ]);
  const fromIdentity = identity?.logo_url?.trim();
  const fromMaster = (master ?? readMasterSettingsCache()).theme.logo_url?.trim();
  const fromAbout = about?.trim();
  const fromSite = site?.trim();
  return fromIdentity || fromMaster || fromAbout || fromSite || null;
}

/** Logo kama data URL kwa jsPDF.addImage (cache + dedupe). */
export async function resolveChurchLogoDataUrl(force = false): Promise<string | null> {
  const url = await resolveChurchLogoUrl();
  if (!url) {
    logoCache = null;
    return null;
  }
  if (!force && logoCache && logoCache.url === url && Date.now() - logoCache.at < LOGO_CACHE_MS) {
    return logoCache.dataUrl;
  }
  const dataUrl = await fetchUrlAsPdfImageDataUrl(url);
  logoCache = { at: Date.now(), url, dataUrl };
  return dataUrl;
}

export function invalidateChurchLogoCache(): void {
  logoCache = null;
}

/** Ongeza logo kwenye meta ya PDF ikiwa haijawekwa. */
export async function withChurchLogoMeta<T extends { logoDataUrl?: string | null }>(meta: T): Promise<T> {
  if (meta.logoDataUrl?.trim()) return meta;
  const logoDataUrl = await resolveChurchLogoDataUrl();
  return logoDataUrl ? { ...meta, logoDataUrl } : meta;
}

function pdfImageFormat(dataUrl: string): "JPEG" | "PNG" {
  return dataUrl.includes("image/jpeg") || dataUrl.includes("image/jpg") ? "JPEG" : "PNG";
}

/** Chora logo kwenye PDF — rudisha true ikiwa imechorwa. */
export function drawChurchLogoOnPdf(
  doc: jsPDF,
  logoDataUrl: string | null | undefined,
  opts: { x: number; y: number; size: number; whiteBg?: boolean },
): boolean {
  const logo = logoDataUrl?.trim();
  if (!logo) return false;
  try {
    const fmt = pdfImageFormat(logo);
    if (opts.whiteBg !== false) {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(opts.x - 0.5, opts.y - 0.5, opts.size + 1, opts.size + 1, 2, 2, "F");
    }
    doc.addImage(logo, fmt, opts.x, opts.y, opts.size, opts.size);
    return true;
  } catch {
    return false;
  }
}

/** Pakua logo ya kanisa kisha ichore. */
export async function drawChurchLogoOnPdfAuto(
  doc: jsPDF,
  opts: { x: number; y: number; size: number; whiteBg?: boolean },
): Promise<boolean> {
  const logo = await resolveChurchLogoDataUrl();
  return drawChurchLogoOnPdf(doc, logo, opts);
}
