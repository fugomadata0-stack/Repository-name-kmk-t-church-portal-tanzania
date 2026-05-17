import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Crown, Eye, FileDown, Link2, Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { usePortal } from "../../context/PortalContext";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { uploadNationalLeadershipAsset } from "../../lib/nationalLeadershipUpload";
import { dispatchPortalReloadMetrics } from "../../lib/portalEvents";
import { downloadNationalLeadershipExecutiveCertificate } from "../../lib/nationalLeadershipCertificatePdf";
import { fetchUrlAsPdfImageDataUrl } from "../../lib/pdfInstitutional";
import { fetchMasterSettingsOptional, readMasterSettingsCache, validateEmail } from "../../services/masterSettingsService";
import {
  fetchNationalLeadershipProfilesOptionalResult,
  nationalLeadershipDisplayTitle,
  subscribeNationalLeadershipProfiles,
  upsertNationalLeadershipProfile,
  type NationalLeadershipAttachment,
  type NationalLeadershipProfileRow,
  type NationalLeadershipRoleKey,
} from "../../services/nationalLeadershipService";
import { ResponsiveLazyImage } from "../common/ResponsiveLazyImage";
import { LeadershipDocumentGallery } from "../executive/LeadershipDocumentGallery";
import { LeadershipDocumentPreviewModal } from "../executive/LeadershipDocumentPreviewModal";
import { LeadershipDocumentUploadCenter } from "../executive/LeadershipDocumentUploadCenter";
import { nationalRowToGalleryItem, nationalRowToPreviewProps } from "../../lib/leadershipDocumentPreview";
import { ExecutiveLeadershipCertificatePreview } from "./ExecutiveLeadershipCertificatePreview";
import { SettingsSupabaseBanner } from "./SettingsSupabaseBanner";

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";
const PDF_ACCEPT = "application/pdf,.pdf";
const MAX_IMAGE = 20 * 1024 * 1024;
const MAX_PDF = 24 * 1024 * 1024;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const REALTIME_DEBOUNCE_MS = 480;

const ROLE_KEYS: NationalLeadershipRoleKey[] = ["askofu_mkuu", "katibu_mkuu", "naibu_katibu_mkuu", "mhasibu_mkuu"];

function emptyRole(role: NationalLeadershipRoleKey, sort: number): NationalLeadershipProfileRow {
  const titles: Record<NationalLeadershipRoleKey, { sw: string; en: string }> = {
    askofu_mkuu: { sw: "ASKOFU MKUU", en: "Presiding Bishop" },
    katibu_mkuu: { sw: "KATIBU MKUU", en: "General Secretary" },
    naibu_katibu_mkuu: { sw: "NAIBU KATIBU MKUU", en: "Deputy General Secretary" },
    mhasibu_mkuu: { sw: "MHASIBU MKUU", en: "Chief Accountant / Treasurer" },
  };
  const t = titles[role];
  return {
    role_key: role,
    display_title_sw: t.sw,
    display_title_en: t.en,
    full_name: "",
    gender: "",
    biography: "",
    leadership_quote: "",
    phone: "",
    whatsapp: "",
    email: "",
    website_url: "",
    country: "Tanzania",
    region: "",
    district: "",
    ward: "",
    physical_address: "",
    profile_photo_url: "",
    signature_url: "",
    cv_pdf_url: "",
    attachments_json: [],
    status: "active",
    start_date: null,
    end_date: null,
    term_years: null,
    is_visible: true,
    sort_order: sort,
  };
}

function mergeLoaded(rows: NationalLeadershipProfileRow[]): Record<NationalLeadershipRoleKey, NationalLeadershipProfileRow> {
  const map = new Map(rows.map((r) => [r.role_key, r]));
  const out = {} as Record<NationalLeadershipRoleKey, NationalLeadershipProfileRow>;
  ROLE_KEYS.forEach((key, i) => {
    out[key] = map.get(key) ?? emptyRole(key, i + 1);
  });
  return out;
}

function validateLeadershipRow(row: NationalLeadershipProfileRow): string | null {
  const em = row.email.trim();
  if (em && !validateEmail(em)) return "Barua pepe ya kiongozi si sahihi.";
  if (row.start_date && !DATE_RE.test(row.start_date)) return "Tarehe ya kuanza: tumia umbizo YYYY-MM-DD au acha tupu.";
  if (row.end_date && !DATE_RE.test(row.end_date)) return "Tarehe ya mwisho: tumia umbizo YYYY-MM-DD au acha tupu.";
  if (row.start_date && row.end_date && row.start_date > row.end_date) return "Tarehe ya mwisho haiwezi kuwa kabla ya tarehe ya kuanza.";
  return null;
}

function formatSwTz(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("sw-TZ", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export function NationalLeadershipEnginePanel(props: { canEdit: boolean }) {
  const { canEdit } = props;
  const { pushToast, reportError, logAudit } = usePortal();
  const [state, setState] = useState<Record<NationalLeadershipRoleKey, NationalLeadershipProfileRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState<NationalLeadershipRoleKey | null>(null);
  const [uploadKey, setUploadKey] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState<NationalLeadershipRoleKey | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [previewRole, setPreviewRole] = useState<NationalLeadershipRoleKey | null>(null);
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      if (!isSupabaseConfigured()) {
        if (!silent) {
          setState(mergeLoaded([]));
          setLoadError("Supabase haijasanidiwa.");
        }
        return;
      }
      const { rows, error } = await fetchNationalLeadershipProfilesOptionalResult();
      if (error) {
        if (!silent) {
          setLoadError(error.message);
          setState(mergeLoaded([]));
        }
        return;
      }
      setState(mergeLoaded(rows));
      setLoadError(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const ch = subscribeNationalLeadershipProfiles(() => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      realtimeDebounceRef.current = setTimeout(() => {
        realtimeDebounceRef.current = null;
        void load({ silent: true });
      }, REALTIME_DEBOUNCE_MS);
    });
    return () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      ch?.unsubscribe();
    };
  }, [load]);

  function patch(role: NationalLeadershipRoleKey, patchRow: Partial<NationalLeadershipProfileRow>) {
    setState((prev) => {
      if (!prev) return prev;
      return { ...prev, [role]: { ...prev[role], ...patchRow } };
    });
  }

  async function save(role: NationalLeadershipRoleKey) {
    if (!canEdit || !state) return;
    const row = state[role];
    const err = validateLeadershipRow(row);
    if (err) {
      pushToast(err, "error");
      return;
    }
    const defaults = emptyRole(role, row.sort_order);
    const cleaned: NationalLeadershipProfileRow = {
      ...row,
      display_title_sw: row.display_title_sw.trim() || defaults.display_title_sw,
      display_title_en: row.display_title_en.trim() || defaults.display_title_en,
      term_years: row.term_years != null && Number.isFinite(row.term_years) ? Math.min(60, Math.max(0, Math.floor(row.term_years))) : null,
      sort_order: Math.min(99, Math.max(0, Math.floor(Number(row.sort_order) || 0))),
    };
    setSavingRole(role);
    try {
      const saved = await upsertNationalLeadershipProfile(cleaned);
      patch(role, saved);
      dispatchPortalReloadMetrics();
      void logAudit("national_leadership_upsert", "national_leadership_profiles", role, {
        role_key: role,
        visible: saved.is_visible,
      });
      pushToast("Rekodi ya uongozi wa kitaifa imehifadhiwa.", "success");
    } catch (e) {
      reportError(e, "National Leadership — hifadhi");
      pushToast("Imeshindwa kuhifadhi. Angalia muunganisho na ruhusa.", "error");
    } finally {
      setSavingRole(null);
    }
  }

  async function exportNationalCertificate(row: NationalLeadershipProfileRow) {
    setPdfBusy(row.role_key);
    try {
      const ms = (await fetchMasterSettingsOptional()) ?? readMasterSettingsCache();
      const logoUrl = ms.theme.logo_url?.trim();
      const logoDataUrl = logoUrl ? await fetchUrlAsPdfImageDataUrl(logoUrl) : null;
      const rawAddr = ms.identity.address?.trim();
      let supplementLines: string[] | undefined;
      if (rawAddr) {
        const parts = rawAddr
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean)
          .slice(0, 8);
        if (parts.length) {
          supplementLines = [
            (ms.identity.official_name || "KANISA LA MENNONITE LA KIINJILI TANZANIA KMK(T)").toUpperCase(),
            ...parts.map((p) => p.toUpperCase()),
          ];
          const c = ms.identity.country?.trim();
          if (c) supplementLines.push(c.toUpperCase());
        }
      }
      await downloadNationalLeadershipExecutiveCertificate(row, {
        logoDataUrl,
        institutionalLines: supplementLines,
        officialSealText: ms.identity.official_seal_text?.trim() || undefined,
      });
      pushToast("PDF ya cheti ya kiutumishi imetengenezwa.", "success");
      void logAudit("national_leadership_certificate_pdf", "national_leadership_profiles", row.role_key, {
        role_key: row.role_key,
      });
    } catch (e) {
      reportError(e, "National Leadership — PDF");
      pushToast("Imeshindwa kutengeneza PDF.", "error");
    } finally {
      setPdfBusy(null);
    }
  }

  async function uploadAsset(role: NationalLeadershipRoleKey, kind: "photo" | "signature" | "cv", file: File | null) {
    if (!file || !canEdit) return;
    if (kind === "cv") {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        pushToast("Tumia faili ya PDF tu kwa CV.", "error");
        return;
      }
      if (file.size > MAX_PDF) {
        pushToast("PDF ni kubwa sana (kikomo ~12MB).", "error");
        return;
      }
    } else {
      if (!file.type.startsWith("image/")) {
        pushToast("Tumia picha tu (PNG/JPEG/WebP).", "error");
        return;
      }
      if (file.size > MAX_IMAGE) {
        pushToast("Picha ni kubwa sana (kikomo 5MB).", "error");
        return;
      }
    }
    const prefix =
      kind === "photo"
        ? `national-leadership/${role}/photo`
        : kind === "signature"
          ? `national-leadership/${role}/signature`
          : `national-leadership/${role}/cv`;
    setUploadKey(`${role}-${kind}`);
    try {
      const url = await uploadNationalLeadershipAsset(prefix, file, kind);
      if (kind === "photo") patch(role, { profile_photo_url: url });
      else if (kind === "signature") patch(role, { signature_url: url });
      else patch(role, { cv_pdf_url: url });
      pushToast("Faili imepakiwa.", "success");
    } catch (e) {
      reportError(e, "National Leadership — upload");
    } finally {
      setUploadKey(null);
    }
  }

  const orderedCards = useMemo(() => ROLE_KEYS.map((k) => state?.[k]).filter(Boolean) as NationalLeadershipProfileRow[], [state]);

  const galleryItems = useMemo(() => orderedCards.map(nationalRowToGalleryItem), [orderedCards]);

  useEffect(() => {
    void fetchMasterSettingsOptional().then((ms) => {
      const u = ms?.theme.logo_url?.trim();
      if (u) setLogoUrl(u);
    });
  }, []);

  const previewRow = previewRole && state ? state[previewRole] : null;

  if (loading || !state) {
    return (
      <div className="space-y-4">
        <SettingsSupabaseBanner />
        <div
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-6 text-slate-600 shadow-inner backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-8 w-8 shrink-0 animate-spin text-[#0B1F3A]" aria-hidden />
          <div>
            <p className="font-semibold text-[#0B1F3A]">Inapakia injini ya uongozi wa kitaifa…</p>
            <p className="text-xs text-slate-500">Realtime + Supabase — jedwali la national_leadership_profiles</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsSupabaseBanner />

      {loadError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900" role="alert">
          <p className="font-semibold">Imeshindwa kusoma data ya viongozi</p>
          <p className="mt-1 text-xs leading-relaxed opacity-90">{loadError}</p>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-900 hover:bg-rose-100/80"
            onClick={() => void load()}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Jaribu tena
          </button>
        </div>
      ) : null}

      {!canEdit ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong>Hariri pekee:</strong> chief_admin au super_admin. Unaweza kuona data; badiliko linahitaji ruhusa ya juu.
        </div>
      ) : null}

      <header className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/35 bg-gradient-to-br from-[#071832] via-[#0B1F3A] to-[#123C69] p-6 text-white shadow-2xl ring-1 ring-white/10">
        <div className="pointer-events-none absolute -right-8 top-0 h-40 w-40 rounded-full bg-amber-400/15 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-inner backdrop-blur-md">
              <Crown className="h-6 w-6 text-amber-200" aria-hidden />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/90">Sajili ya data — Supabase</p>
              <h3 className="font-kmkt-display text-xl font-bold tracking-tight sm:text-2xl">Uongozi wa Kitaifa — Engine</h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-blue-100/95">
                Nafasi nne tu: Askofu Mkuu, Katibu Mkuu, Naibu Katibu Mkuu, Mhasibu Mkuu. Jaza fomu hapa; hakuna ubao wa viongozi katika skrini hii — PDF, dashibodi na mifumo mingine husoma{" "}
                <strong className="font-semibold text-white">national_leadership_profiles</strong> moja kwa moja (Realtime).
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Pakia upya
            </button>
            <p className="max-w-xs rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-[11px] leading-relaxed text-amber-50/95 backdrop-blur-sm">
              <span className="font-semibold text-amber-200">Kumbuka:</span> kila nafasi inahifadhiwa peke yake. Hakikisha migration ya jedwali limekwishatekelezwa kwenye Supabase.
            </p>
          </div>
        </div>
      </header>

      <LeadershipDocumentGallery
        items={galleryItems}
        onPreview={(item) => {
          const rk = item.roleKey as NationalLeadershipRoleKey | undefined;
          if (rk && ROLE_KEYS.includes(rk)) setPreviewRole(rk);
        }}
        onBulkExport={(selected) => {
          for (const it of selected) {
            const rk = it.roleKey as NationalLeadershipRoleKey | undefined;
            const r = rk && state?.[rk];
            if (r) void exportNationalCertificate(r);
          }
        }}
      />

      <div className="space-y-5">
        {orderedCards.map((row) => (
          <article
            key={row.role_key}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  {row.profile_photo_url ? (
                    <ResponsiveLazyImage
                      src={row.profile_photo_url}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      width={96}
                      height={96}
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[9px] font-semibold uppercase text-slate-400">
                      —
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#123C69]">
                    {nationalLeadershipDisplayTitle(row, "sw")}
                    {row.display_title_en.trim() ? (
                      <span className="font-normal text-slate-500"> · {nationalLeadershipDisplayTitle(row, "en")}</span>
                    ) : null}
                  </p>
                  <h4 className="truncate font-kmkt-display text-base font-bold text-[#0B1F3A] sm:text-lg">
                    {row.full_name.trim() || "— Jina halijasajiliwa —"}
                  </h4>
                  <p className="truncate text-[11px] text-slate-500">
                    <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px]">{row.role_key}</code>
                    {" · "}
                    {row.leadership_quote.trim() || row.biography.trim() || "Hakuna wasifu fupi bado"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                    row.status === "active" ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {row.status === "active" ? "Hai" : "Inactive"}
                </span>
                {!row.is_visible ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-amber-950">
                    Imefichwa (exports)
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                    Inaonekana (exports)
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-4">
            <NatLeadFormSection title="Taarifa za msingi / Jina na cheo rasmi">
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="Full name / Jina kamili"
                value={row.full_name}
                onChange={(v) => patch(row.role_key, { full_name: v })}
                disabled={!canEdit}
              />
              <Field
                label="Official title (SW)"
                value={row.display_title_sw}
                onChange={(v) => patch(row.role_key, { display_title_sw: v })}
                disabled={!canEdit}
              />
              <Field
                label="Official title (EN)"
                value={row.display_title_en}
                onChange={(v) => patch(row.role_key, { display_title_en: v })}
                disabled={!canEdit}
              />
              <label className="grid gap-1 text-xs font-medium text-slate-700">
                Gender / Jinsia
                <select
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={row.gender}
                  onChange={(e) => patch(row.role_key, { gender: e.target.value })}
                  disabled={!canEdit}
                >
                  <option value="">—</option>
                  <option value="male">Male / Mwanaume</option>
                  <option value="female">Female / Mwanamke</option>
                  <option value="other">Other / Nyingine</option>
                </select>
              </label>
            </div>
            </NatLeadFormSection>

            <NatLeadFormSection title="Wasifu na kauli / Bio na quote">
              <div className="grid gap-3">
                <Area label="Biography / Wasifu" value={row.biography} onChange={(v) => patch(row.role_key, { biography: v })} disabled={!canEdit} rows={6} />
                <Area label="Leadership quote / Kauli ya uongozi" value={row.leadership_quote} onChange={(v) => patch(row.role_key, { leadership_quote: v })} disabled={!canEdit} rows={4} />
              </div>
            </NatLeadFormSection>

            <NatLeadFormSection title="Mawasiliano / Contacts">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Simu" value={row.phone} onChange={(v) => patch(row.role_key, { phone: v })} disabled={!canEdit} />
                <Field label="WhatsApp" value={row.whatsapp} onChange={(v) => patch(row.role_key, { whatsapp: v })} disabled={!canEdit} />
                <Field label="Barua pepe" value={row.email} onChange={(v) => patch(row.role_key, { email: v })} disabled={!canEdit} />
                <Field label="Website" value={row.website_url} onChange={(v) => patch(row.role_key, { website_url: v })} disabled={!canEdit} />
              </div>
            </NatLeadFormSection>

            <NatLeadFormSection title="Mahali / Location">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Nchi" value={row.country} onChange={(v) => patch(row.role_key, { country: v })} disabled={!canEdit} />
                <Field label="Mkoa" value={row.region} onChange={(v) => patch(row.role_key, { region: v })} disabled={!canEdit} />
                <Field label="Wilaya" value={row.district} onChange={(v) => patch(row.role_key, { district: v })} disabled={!canEdit} />
                <Field label="Kata" value={row.ward} onChange={(v) => patch(row.role_key, { ward: v })} disabled={!canEdit} />
                <Field label="Anwani ya kimwili" value={row.physical_address} onChange={(v) => patch(row.role_key, { physical_address: v })} disabled={!canEdit} />
              </div>
            </NatLeadFormSection>

            <NatLeadFormSection title="Picha, saini, CV na viambatanishi / Faili">
              {canEdit ? (
                <LeadershipDocumentUploadCenter
                  kinds={["photo", "signature", "cv", "attach"]}
                  disabled={!canEdit}
                  busy={!!uploadKey}
                  onUpload={async (kind, file) => {
                    if (kind === "attach") {
                      pushToast("Tumia sehemu ya viambatanishi hapa chini kwa URL.", "info");
                      return;
                    }
                    await uploadAsset(row.role_key, kind as "photo" | "signature" | "cv", file);
                  }}
                />
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                <UploadRow
                  label="Picha ya wasifu / Profile photo"
                  accept={IMAGE_ACCEPT}
                  busy={uploadKey === `${row.role_key}-photo`}
                  url={row.profile_photo_url}
                  onFile={(f) => void uploadAsset(row.role_key, "photo", f)}
                  onClear={() => patch(row.role_key, { profile_photo_url: "" })}
                  disabled={!canEdit}
                  kind="image"
                />
                <UploadRow
                  label="Saini rasmi / Official signature"
                  accept={IMAGE_ACCEPT}
                  busy={uploadKey === `${row.role_key}-signature`}
                  url={row.signature_url}
                  onFile={(f) => void uploadAsset(row.role_key, "signature", f)}
                  onClear={() => patch(row.role_key, { signature_url: "" })}
                  disabled={!canEdit}
                  kind="image"
                />
                <UploadRow
                  label="CV (PDF)"
                  accept={PDF_ACCEPT}
                  busy={uploadKey === `${row.role_key}-cv`}
                  url={row.cv_pdf_url}
                  onFile={(f) => void uploadAsset(row.role_key, "cv", f)}
                  onClear={() => patch(row.role_key, { cv_pdf_url: "" })}
                  disabled={!canEdit}
                  kind="pdf"
                />
              </div>
              <AttachmentsEditor
                items={row.attachments_json}
                onChange={(attachments_json) => patch(row.role_key, { attachments_json })}
                disabled={!canEdit}
              />
            </NatLeadFormSection>

            <NatLeadFormSection title="Mfumo na mwonekano / Status na ripoti">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-xs font-medium text-slate-700">
                  Status
                  <select
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={row.status}
                    onChange={(e) => patch(row.role_key, { status: e.target.value as "active" | "inactive" })}
                    disabled={!canEdit}
                  >
                    <option value="active">Hai (Active)</option>
                    <option value="inactive">Haifanyi kazi (Inactive)</option>
                  </select>
                </label>
                <Field
                  label="Mpangilio / Sort (0–99)"
                  type="number"
                  min={0}
                  max={99}
                  value={String(row.sort_order)}
                  onChange={(v) => patch(row.role_key, { sort_order: Math.min(99, Math.max(0, Number(v) || 0)) })}
                  disabled={!canEdit}
                />
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={row.is_visible}
                    onChange={(e) => patch(row.role_key, { is_visible: e.target.checked })}
                    disabled={!canEdit}
                  />
                  Onyesha kwenye PDF na ripoti (visibility / public)
                </label>
                <Field
                  label="Start date (YYYY-MM-DD)"
                  value={row.start_date ?? ""}
                  onChange={(v) => patch(row.role_key, { start_date: v.trim() || null })}
                  disabled={!canEdit}
                />
                <Field
                  label="End date (YYYY-MM-DD)"
                  value={row.end_date ?? ""}
                  onChange={(v) => patch(row.role_key, { end_date: v.trim() || null })}
                  disabled={!canEdit}
                />
                <Field
                  label="Mihula (miaka) / Term years"
                  type="number"
                  min={0}
                  max={60}
                  value={row.term_years != null ? String(row.term_years) : ""}
                  onChange={(v) =>
                    patch(row.role_key, {
                      term_years: v.trim() === "" ? null : Math.min(60, Math.max(0, Math.floor(Number(v)))),
                    })
                  }
                  disabled={!canEdit}
                />
              </div>
            </NatLeadFormSection>

            <NatLeadFormSection title="Cheti cha PDF / Hakiki na pakua">
              <div className="space-y-3">
                <p className="text-[11px] leading-relaxed text-slate-600">
                  Nembo na anwani zinatoka <strong>Mipangilio mikuu</strong> (Supabase). Data ya nafasi hii ni <strong>hai</strong> (Realtime).
                </p>
                <ExecutiveLeadershipCertificatePreview row={row} />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewRole(row.role_key)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-2 text-xs font-semibold text-[#0B1F3A] shadow-sm transition hover:bg-amber-100"
                  >
                    <Eye className="h-4 w-4" aria-hidden />
                    Hakiki kamili
                  </button>
                  <button
                    type="button"
                    disabled={pdfBusy === row.role_key}
                    aria-busy={pdfBusy === row.role_key}
                    onClick={() => void exportNationalCertificate(row)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/60 bg-gradient-to-r from-[#0B1F3A] to-[#123C69] px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-50"
                  >
                    {pdfBusy === row.role_key ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <FileDown className="h-4 w-4" aria-hidden />
                    )}
                    Pakua cheti (PDF)
                  </button>
                </div>
              </div>
            </NatLeadFormSection>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <div className="flex flex-wrap gap-2">
                {row.signature_url ? (
                  <div className="relative h-12 w-28 overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <ResponsiveLazyImage
                      src={row.signature_url}
                      alt="Signature preview"
                      className="absolute inset-0 h-full w-full object-cover"
                      width={160}
                      height={64}
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-500">Hakuna sahihi — pakia picha ya saini</span>
                )}
              </div>
              <div className="flex min-w-0 flex-col items-stretch gap-2 sm:items-end">
                <p className="w-full text-right text-[10px] text-slate-400 sm:max-w-[14rem]">
                  Mwisho wa kuhifadhi: {formatSwTz(row.updated_at)}
                </p>
              <button
                type="button"
                disabled={!canEdit || savingRole === row.role_key}
                aria-busy={savingRole === row.role_key}
                onClick={() => void save(row.role_key)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B1F3A] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-[#123C69] disabled:opacity-50"
              >
                {savingRole === row.role_key ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
                Hifadhi nafasi hii
              </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <LeadershipDocumentPreviewModal
        open={!!previewRow}
        onClose={() => setPreviewRole(null)}
        title={previewRow ? nationalLeadershipDisplayTitle(previewRow, "sw") : "Hakiki"}
        preview={
          previewRow
            ? nationalRowToPreviewProps(previewRow, { logoUrl, kind: "certificate" })
            : { fullName: "—", titleSw: "—" }
        }
        pdfBusy={previewRow ? pdfBusy === previewRow.role_key : false}
        onDownloadPdf={
          previewRow
            ? async () => {
                await exportNationalCertificate(previewRow);
              }
            : undefined
        }
        onSaveDraft={
          previewRow && canEdit
            ? () => {
                void save(previewRow.role_key);
              }
            : undefined
        }
      />
    </div>
  );
}

function NatLeadFormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <h5 className="border-b border-slate-200/90 pb-2 text-xs font-bold uppercase tracking-wide text-[#0B1F3A]">{title}</h5>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  type = "text",
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  type?: string;
  min?: number;
  max?: number;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-slate-700">
      {label}
      <input
        type={type}
        min={min}
        max={max}
        className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </label>
  );
}

function Area({
  label,
  value,
  onChange,
  disabled,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  rows?: number;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-slate-700">
      {label}
      <textarea
        rows={rows}
        className="min-h-[5rem] rounded-xl border border-slate-200 px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </label>
  );
}

function UploadRow({
  label,
  accept,
  busy,
  url,
  onFile,
  onClear,
  disabled,
  kind,
}: {
  label: string;
  accept: string;
  busy: boolean;
  url: string;
  onFile: (f: File | null) => void;
  onClear: () => void;
  disabled: boolean;
  kind: "image" | "pdf";
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-slate-700">
      {label}
      <input type="file" accept={accept} disabled={disabled || busy} onChange={(e) => onFile(e.target.files?.[0] ?? null)} className="text-xs" />
      {busy ? <span className="text-[11px] text-slate-500">Inapakia…</span> : null}
      {url ? (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {kind === "image" ? (
            <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200">
              <ResponsiveLazyImage src={url} alt="" className="absolute inset-0 h-full w-full object-cover" width={128} height={128} loading="lazy" />
            </div>
          ) : (
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 underline">
              <Link2 className="h-3 w-3" aria-hidden />
              Fungua PDF
            </a>
          )}
          <button type="button" className="text-xs font-semibold text-rose-700 underline" onClick={onClear} disabled={disabled}>
            Ondoa URL
          </button>
        </div>
      ) : null}
    </label>
  );
}

function AttachmentsEditor({
  items,
  onChange,
  disabled,
}: {
  items: NationalLeadershipAttachment[];
  onChange: (next: NationalLeadershipAttachment[]) => void;
  disabled: boolean;
}) {
  return (
    <div className="mt-4 space-y-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[#0B1F3A]">Viambatanishi vya ziada / Attachments</p>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 disabled:opacity-50"
          onClick={() => onChange([...items, { name: "", url: "" }])}
        >
          <Plus className="h-3 w-3" aria-hidden />
          Ongeza
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={`att-${idx}`} className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-2">
            <Field label="Jina" value={item.name} onChange={(v) => {
              const next = [...items];
              next[idx] = { ...next[idx], name: v };
              onChange(next);
            }} disabled={disabled} />
            <Field label="URL" value={item.url} onChange={(v) => {
              const next = [...items];
              next[idx] = { ...next[idx], url: v };
              onChange(next);
            }} disabled={disabled} />
            <button
              type="button"
              className="mb-1 rounded-lg p-2 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
              disabled={disabled}
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
              aria-label="Ondoa kiambatanisho"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
