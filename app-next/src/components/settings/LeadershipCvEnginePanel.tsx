import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ResponsiveLazyImage } from "../common/ResponsiveLazyImage";
import { LeadershipDocumentGallery } from "../executive/LeadershipDocumentGallery";
import { LeadershipDocumentPreviewModal } from "../executive/LeadershipDocumentPreviewModal";
import { usePortal } from "../../context/PortalContext";
import { downloadLeadershipAppointmentCertificate } from "../../lib/leadershipAppointmentCertificatePdf";
import { kiongoziToGalleryItem, kiongoziToPreviewProps } from "../../lib/leadershipDocumentPreview";
import { downloadLeaderProfilePdf } from "../../lib/leadershipPdf";
import { fetchUrlAsPdfImageDataUrl } from "../../lib/pdfInstitutional";
import { dispatchPortalReloadMetrics } from "../../lib/portalEvents";
import { fetchMasterSettings } from "../../services/masterSettingsService";
import {
  fetchCvSearchLeaderIds,
  fetchLeadershipCvBundle,
  saveLeadershipCvBundle,
  signLeadershipCvPath,
  subscribeLeadershipCvEngine,
  uploadLeadershipCvObject,
} from "../../services/leadershipCvEngineService";
import { readLeadershipCredentialPrefill, clearLeadershipCredentialPrefill } from "../../lib/leadershipCredentialPrefill";
import { fetchChurchViongozi, fetchOfficialLeadershipSigners, upsertKiongozi } from "../../services/viongoziService";
import type {
  KiongoziRecord,
  LeadershipCvAttachmentRow,
  LeadershipCvBundle,
  LeadershipCvCertificateRow,
  LeadershipCvEducationRow,
  LeadershipCvExperienceRow,
  LeadershipCvSkillRow,
  LeadershipProfileCvRecord,
} from "../../types";

const LEVEL_PRESETS = [
  "",
  "KMK(T) National Level",
  "Dayosisi Level",
  "Jimbo Level",
  "Tawi/Kituo Level",
  "Idara Level",
  "Huduma Level",
  "Taasisi Level",
  "Jumuiya Level",
] as const;

const EDU_KINDS = [
  { v: "certificate", l: "Cheti" },
  { v: "diploma", l: "Diploma" },
  { v: "degree", l: "Shahada" },
  { v: "masters", l: "Masters" },
  { v: "theology", l: "Theologia" },
  { v: "seminar", l: "Semina" },
  { v: "workshop", l: "Workshop" },
  { v: "other", l: "Nyingine" },
] as const;

const SKILL_CATS = [
  { v: "leadership", l: "Ujuzi wa uongozi" },
  { v: "ministry", l: "Huduma" },
  { v: "technical", l: "Kiufundi" },
  { v: "language", l: "Lugha" },
  { v: "spiritual_gift", l: "Karama" },
] as const;

const ATT_KINDS = [
  { v: "cv_pdf", l: "CV (PDF)" },
  { v: "certificate", l: "Cheti" },
  { v: "appointment", l: "Hati ya uteuzi" },
  { v: "ministry", l: "Hati ya huduma" },
  { v: "national_id", l: "NIDA" },
  { v: "passport", l: "Pasipoti" },
  { v: "other", l: "Nyingine" },
] as const;

/** Chuja ngazi: preset na thamani za DB zinaweza kutofanana (mf. "Dayosisi" vs "Dayosisi Level"). */
/** Chagua ngazi ya kawaida kutoka kwa cheo + muundo (wakati `leadership_level` tupu). */
function inferLeadershipLevelPreset(r: KiongoziRecord): string {
  const cheo = `${r.cheo ?? ""}`.toUpperCase();
  if (/ASKOFU\s+MKUU|KATIBU\s+MKUU|NAIBU\s+KATIBU|MHASIBU\s+WA\s+KMK/i.test(cheo)) {
    return "KMK(T) National Level";
  }
  if ((r.jumuiya_name ?? "").trim()) return "Jumuiya Level";
  if ((r.taasisi_name ?? "").trim()) return "Taasisi Level";
  if ((r.huduma_name ?? "").trim()) return "Huduma Level";
  if ((r.idara_name ?? "").trim()) return "Idara Level";
  if ((r.tawi ?? "").trim()) return "Tawi/Kituo Level";
  if ((r.jimbo ?? "").trim()) return "Jimbo Level";
  if ((r.dayosisi ?? "").trim()) return "Dayosisi Level";
  return "";
}

function rowMatchesLeadershipLevelPreset(r: KiongoziRecord, filter: string): boolean {
  const needle = filter.trim().toLowerCase();
  if (!needle) return true;
  const hay = `${r.leadership_level ?? ""} ${r.ngazi ?? ""}`.trim().toLowerCase();
  if (!hay) return false;
  if (hay === needle) return true;
  if (hay.includes(needle) || needle.includes(hay)) return true;
  const tokens = needle.split(/\s+/).filter((t) => t.length > 2);
  if (tokens.length && tokens.every((t) => hay.includes(t))) return true;
  return false;
}

async function toDataUrl(url: string): Promise<string | null> {
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

function emptyProfile(leaderId: string): LeadershipProfileCvRecord {
  return {
    id: "",
    leader_id: leaderId,
    nationality: null,
    biography: null,
    reporting_office: null,
    profile_photo_storage_path: null,
    signature_storage_path: null,
    original_cv_storage_path: null,
    original_cv_file_name: null,
    original_cv_mime: null,
    original_cv_bytes: null,
  };
}

export function LeadershipCvEnginePanel(props: { canEdit: boolean }) {
  const { pushToast, reportError, about, supabaseReady, canPortalViewModule } = usePortal();
  const canViewViongozi = canPortalViewModule("viongozi");

  const [leaders, setLeaders] = useState<KiongoziRecord[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");
  const [nameQ, setNameQ] = useState("");
  const [cvQ, setCvQ] = useState("");
  const [cvHitIds, setCvHitIds] = useState<Set<string>>(new Set());
  const [levelFilter, setLevelFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [certPdfBusy, setCertPdfBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [live, setLive] = useState<"idle" | "synced" | "pending" | "error">("idle");
  const [officialSigners, setOfficialSigners] = useState<{ full_name: string; title: string }[]>([]);

  const [leader, setLeader] = useState<KiongoziRecord | null>(null);
  const [profile, setProfile] = useState<LeadershipProfileCvRecord | null>(null);
  const [experience, setExperience] = useState<LeadershipCvExperienceRow[]>([]);
  const [education, setEducation] = useState<LeadershipCvEducationRow[]>([]);
  const [certificates, setCertificates] = useState<LeadershipCvCertificateRow[]>([]);
  const [skills, setSkills] = useState<LeadershipCvSkillRow[]>([]);
  const [attachments, setAttachments] = useState<LeadershipCvAttachmentRow[]>([]);

  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [previewSig, setPreviewSig] = useState<string | null>(null);

  const cvSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  const [attachKindPick, setAttachKindPick] = useState("cv_pdf");
  const [bundleTick, setBundleTick] = useState(0);
  const leadersRef = useRef(leaders);
  leadersRef.current = leaders;

  const reloadList = useCallback(async () => {
    if (!canViewViongozi) {
      setLeaders([]);
      return;
    }
    const rows = await fetchChurchViongozi();
    setLeaders(rows);
  }, [canViewViongozi]);

  useEffect(() => {
    mounted.current = true;
    void (async () => {
      setLoadingList(true);
      try {
        await reloadList();
      } catch (e) {
        reportError(e, "CV engine — orodha");
      } finally {
        if (mounted.current) setLoadingList(false);
      }
    })();
    return () => {
      mounted.current = false;
    };
  }, [reloadList, reportError]);

  useEffect(() => {
    if (loadingList || !leaders.length) return;
    const pre = readLeadershipCredentialPrefill();
    if (!pre?.leaderId) return;
    const hit = leaders.some((l) => l.id === pre.leaderId);
    if (hit) {
      setSelectedId(pre.leaderId);
      pushToast(`Kiongozi amechaguliwa kutoka Cheti & CV: ${pre.fullName ?? pre.leaderId}`, "success");
    }
    clearLeadershipCredentialPrefill();
  }, [loadingList, leaders, pushToast]);

  useEffect(() => {
    if (!supabaseReady || !canViewViongozi) return;
    let cancelled = false;
    void (async () => {
      try {
        const rows = await fetchOfficialLeadershipSigners();
        if (!cancelled) setOfficialSigners(rows);
      } catch {
        if (!cancelled) setOfficialSigners([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabaseReady, canViewViongozi]);

  useEffect(() => {
    void fetchMasterSettings().then((ms) => {
      const u = ms.theme.logo_url?.trim();
      if (u) setLogoUrl(u);
    });
  }, []);

  useEffect(() => {
    if (!supabaseReady || !canViewViongozi) {
      setLive("idle");
      return;
    }
    const ch = subscribeLeadershipCvEngine({
      onChange: () => {
        if (!mounted.current) return;
        setLive("pending");
        if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
        realtimeDebounceRef.current = setTimeout(() => {
          realtimeDebounceRef.current = null;
          void reloadList().finally(() => {
            if (mounted.current) {
              setLive("synced");
              setBundleTick((t) => t + 1);
              dispatchPortalReloadMetrics();
            }
          });
        }, 480);
      },
      onSubscribeStatus: (s) => {
        if (!mounted.current) return;
        if (s === "SUBSCRIBED") setLive("synced");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") setLive("error");
        else if (s === "CLOSED") setLive("idle");
      },
    });
    return () => {
      if (realtimeDebounceRef.current) {
        clearTimeout(realtimeDebounceRef.current);
        realtimeDebounceRef.current = null;
      }
      ch?.unsubscribe();
    };
  }, [supabaseReady, canViewViongozi, reloadList]);

  useEffect(() => {
    const q = cvQ.trim();
    if (cvSearchTimer.current) clearTimeout(cvSearchTimer.current);
    if (q.length < 2) {
      setCvHitIds(new Set());
      return;
    }
    cvSearchTimer.current = setTimeout(() => {
      void (async () => {
        try {
          const ids = await fetchCvSearchLeaderIds(q);
          if (mounted.current) setCvHitIds(new Set(ids));
        } catch (e) {
          reportError(e, "CV search");
        }
      })();
    }, 420);
    return () => {
      if (cvSearchTimer.current) clearTimeout(cvSearchTimer.current);
    };
  }, [cvQ, reportError]);

  useEffect(() => {
    if (!selectedId) {
      setLeader(null);
      return;
    }
    const L = leaders.find((x) => x.id === selectedId);
    if (L) {
      const inferred = inferLeadershipLevelPreset(L);
      const lv = (L.leadership_level ?? "").trim();
      setLeader({ ...L, leadership_level: lv || inferred || null });
    }
  }, [selectedId, leaders]);

  useEffect(() => {
    if (!selectedId) {
      setProfile(null);
      setExperience([]);
      setEducation([]);
      setCertificates([]);
      setSkills([]);
      setAttachments([]);
      setPreviewPhoto(null);
      setPreviewSig(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const L = leadersRef.current.find((x) => x.id === selectedId) ?? null;
      try {
        const b = await fetchLeadershipCvBundle(selectedId);
        if (cancelled) return;
        setProfile(b.profile ?? emptyProfile(selectedId));
        setExperience(b.experience);
        setEducation(b.education);
        setCertificates(b.certificates);
        setSkills(b.skills);
        setAttachments(b.attachments);

        const p = b.profile;
        const photoPath = p?.profile_photo_storage_path?.trim();
        const sigPath = p?.signature_storage_path?.trim();
        const [pu, su] = await Promise.all([
          photoPath ? signLeadershipCvPath(photoPath) : null,
          sigPath ? signLeadershipCvPath(sigPath) : null,
        ]);
        if (cancelled) return;
        setPreviewPhoto(pu ? await toDataUrl(pu) : L?.photo_url?.trim() ? await toDataUrl(L.photo_url) : null);
        setPreviewSig(su ? await toDataUrl(su) : L?.signature_url?.trim() ? await toDataUrl(L.signature_url) : null);
      } catch (e) {
        if (!cancelled) reportError(e, "CV bundle");
        if (!cancelled) {
          setProfile(emptyProfile(selectedId));
          setExperience([]);
          setEducation([]);
          setCertificates([]);
          setSkills([]);
          setAttachments([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, bundleTick, reportError]);

  const filteredLeaders = useMemo(() => {
    const nq = nameQ.trim().toLowerCase();
    let rows = leaders;
    if (nq) {
      rows = rows.filter((r) => {
        const blob = `${r.jina} ${r.full_name ?? ""} ${r.cheo ?? ""} ${r.leadership_level ?? ""} ${r.ngazi}`.toLowerCase();
        return blob.includes(nq);
      });
    }
    if (levelFilter) {
      rows = rows.filter((r) => rowMatchesLeadershipLevelPreset(r, levelFilter));
    }
    const cq = cvQ.trim();
    if (cq.length >= 2 && cvHitIds.size) {
      rows = rows.filter((r) => cvHitIds.has(r.id));
    }
    return rows;
  }, [leaders, nameQ, levelFilter, cvQ, cvHitIds]);

  async function onSave() {
    if (!props.canEdit || !leader) return;
    setBusy(true);
    try {
      await upsertKiongozi({
        id: leader.id,
        jina: leader.jina,
        full_name: leader.full_name ?? leader.jina,
        cheo: leader.cheo,
        ngazi: leader.ngazi,
        leadership_level: leader.leadership_level ?? leader.ngazi,
        assigned_entity: leader.assigned_entity ?? "",
        gender: leader.gender,
        date_of_birth: leader.date_of_birth,
        simu: leader.simu,
        whatsapp: leader.whatsapp,
        email: leader.email,
        address: leader.address,
        mkoa: leader.mkoa,
        wilaya: leader.wilaya,
        kata: leader.kata,
        national_id: leader.national_id,
        passport_number: leader.passport_number,
        church_member_id: leader.church_member_id,
        dayosisi_id: leader.dayosisi_id,
        jimbo_id: leader.jimbo_id,
        tawi_id: leader.tawi_id,
        start_date: leader.start_date,
        end_date: leader.end_date,
        appointment_date: leader.appointment_date,
        term_status: leader.term_status,
        status: leader.status,
        photo_url: leader.photo_url,
        signature_url: leader.signature_url,
        idara_name: leader.idara_name,
        huduma_name: leader.huduma_name,
        taasisi_name: leader.taasisi_name,
        jumuiya_name: leader.jumuiya_name,
        pdf_issued_by_name: leader.pdf_issued_by_name,
        pdf_issued_by_title: leader.pdf_issued_by_title,
        notes: leader.notes,
        former_leader: leader.former_leader,
        reason_for_leaving: leader.reason_for_leaving,
        education_summary: leader.education_summary,
        theology_training: leader.theology_training,
        professional_skills: leader.professional_skills,
        certificates_summary: leader.certificates_summary,
        ministry_gifts: leader.ministry_gifts,
        ministry_experience: leader.ministry_experience,
        internal_notes: leader.internal_notes,
        audit_notes: leader.audit_notes,
      });

      const bundle: LeadershipCvBundle = {
        profile: profile ?? emptyProfile(leader.id),
        experience,
        education,
        certificates,
        skills,
        attachments,
      };
      await saveLeadershipCvBundle(leader.id, bundle);
      pushToast("Wasifu wa CV umehifadhiwa.", "success");
      await reloadList();
      setBundleTick((t) => t + 1);
      dispatchPortalReloadMetrics();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Imeshindwa kuhifadhi.", "error");
      reportError(e, "CV save");
    } finally {
      setBusy(false);
    }
  }

  async function onPdf() {
    if (!leader) return;
    setPdfBusy(true);
    try {
      const [ms, b] = await Promise.all([fetchMasterSettings(), fetchLeadershipCvBundle(leader.id)]);
      const logoUrl = ms.theme.logo_url?.trim();
      const logoDataUrl = logoUrl ? await toDataUrl(logoUrl) : null;
      const p = b.profile;
      const photoUrl =
        (p?.profile_photo_storage_path ? await signLeadershipCvPath(p.profile_photo_storage_path) : null) ||
        leader.photo_url ||
        "";
      const sigUrl =
        (p?.signature_storage_path ? await signLeadershipCvPath(p.signature_storage_path) : null) || leader.signature_url || "";
      const photoDataUrl = photoUrl ? await toDataUrl(photoUrl) : null;
      const signatureDataUrl = sigUrl ? await toDataUrl(sigUrl) : null;
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
      await downloadLeaderProfilePdf(leader, {
        churchName: about.church_name?.trim() || undefined,
        portalBaseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
        bundle: b,
        logoDataUrl,
        photoDataUrl,
        signatureDataUrl,
        institutionalLines: supplementLines,
      });
    } catch (e) {
      reportError(e, "CV PDF");
      pushToast("PDF imeshindikana.", "error");
    } finally {
      setPdfBusy(false);
    }
  }

  async function onAppointmentCertPdf() {
    if (!leader) return;
    setCertPdfBusy(true);
    try {
      const ms = await fetchMasterSettings();
      const logoDataUrl = logoUrl ? await fetchUrlAsPdfImageDataUrl(logoUrl) : null;
      const p = profile;
      const photoUrl =
        (p?.profile_photo_storage_path ? await signLeadershipCvPath(p.profile_photo_storage_path) : null) ||
        leader.photo_url ||
        "";
      const sigUrl =
        (p?.signature_storage_path ? await signLeadershipCvPath(p.signature_storage_path) : null) || leader.signature_url || "";
      const photoDataUrl = photoUrl ? await fetchUrlAsPdfImageDataUrl(photoUrl) : null;
      const signatureDataUrl = sigUrl ? await fetchUrlAsPdfImageDataUrl(sigUrl) : null;
      await downloadLeadershipAppointmentCertificate(leader, {
        logoDataUrl,
        photoDataUrl,
        signatureDataUrl,
        officialSealText: ms.identity.official_seal_text?.trim() || undefined,
        portalBaseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
      });
      pushToast("Cheti cha uteuzi limepakuliwa.", "success");
    } catch (e) {
      reportError(e, "Appointment cert PDF");
      pushToast("PDF ya cheti imeshindikana.", "error");
    } finally {
      setCertPdfBusy(false);
    }
  }

  const cvGalleryItems = useMemo(() => filteredLeaders.map(kiongoziToGalleryItem), [filteredLeaders]);

  async function uploadTo(
    kind: "photo" | "signature" | "cv" | "cert" | "attach",
    file: File | null,
    extra?: { attachmentKind?: string; certIndex?: number }
  ) {
    if (!props.canEdit || !leader || !file) return;
    try {
      const { path } = await uploadLeadershipCvObject(leader.id, kind === "attach" ? "attach" : kind, file);
      if (kind === "photo") {
        setProfile((prev) => ({ ...(prev ?? emptyProfile(leader.id)), profile_photo_storage_path: path }));
        const signed = await signLeadershipCvPath(path);
        setPreviewPhoto(signed ? await toDataUrl(signed) : null);
      } else if (kind === "signature") {
        setProfile((prev) => ({ ...(prev ?? emptyProfile(leader.id)), signature_storage_path: path }));
        const signed = await signLeadershipCvPath(path);
        setPreviewSig(signed ? await toDataUrl(signed) : null);
      } else if (kind === "cv") {
        setProfile((prev) => ({
          ...(prev ?? emptyProfile(leader.id)),
          original_cv_storage_path: path,
          original_cv_file_name: file.name,
          original_cv_mime: file.type || null,
          original_cv_bytes: file.size,
        }));
      } else if (kind === "cert" && extra?.certIndex != null) {
        setCertificates((prev) => {
          const next = [...prev];
          const row = next[extra.certIndex!];
          if (row) next[extra.certIndex!] = { ...row, document_storage_path: path };
          return next;
        });
      } else if (kind === "attach") {
        setAttachments((prev) => [
          ...prev,
          {
            id: `tmp-${crypto.randomUUID()}`,
            leader_id: leader.id,
            attachment_kind: extra?.attachmentKind || "other",
            storage_path: path,
            file_name: file.name,
            mime_type: file.type || null,
            file_size: file.size,
            sort_order: prev.length,
          },
        ]);
      }
      pushToast("Faili imepakiwa.", "success");
    } catch (e) {
      reportError(e, "CV upload");
      pushToast(e instanceof Error ? e.message : "Upload imeshindikana.", "error");
    }
  }

  if (!canViewViongozi) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Una hitaji ruhusa ya kuona moduli ya <strong>Viongozi</strong> ili kutumia injini ya CV.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          Injini ya wasifu rasmi — data kwenye Supabase (hifadhi + jedwali + realtime).
        </p>
        {!supabaseReady ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">Supabase haijasajiliwa</span>
        ) : live === "error" ? (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800">Realtime — hitilafu</span>
        ) : live === "pending" ? (
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-900">Inasasisha…</span>
        ) : (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-900">Live · CV</span>
        )}
      </div>

      <LeadershipDocumentGallery
        items={cvGalleryItems}
        onPreview={(item) => {
          const L = leaders.find((x) => x.id === item.id);
          if (L) {
            setSelectedId(L.id);
            setPreviewOpen(true);
          }
        }}
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(220px,280px)_1fr]">
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
          <label className="grid gap-1 text-xs font-semibold text-slate-700">
            Tafuta jina / cheo
            <input className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" value={nameQ} onChange={(e) => setNameQ(e.target.value)} />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-700">
            Tafuta elimu / uzoefu (herufi 2+)
            <input className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" value={cvQ} onChange={(e) => setCvQ(e.target.value)} />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-700">
            Chuja ngazi
            <select className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
              {LEVEL_PRESETS.map((lv) => (
                <option key={lv || "all"} value={lv}>
                  {lv || "— zote —"}
                </option>
              ))}
            </select>
          </label>
          <div className="max-h-[420px] overflow-y-auto rounded-lg border border-slate-200 bg-white">
            {loadingList ? (
              <p className="p-3 text-sm text-slate-500">Inapakia…</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredLeaders.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${
                        selectedId === r.id ? "bg-[#0B1F3A]/10 font-semibold text-[#0B1F3A]" : "text-slate-800"
                      }`}
                    >
                      <span>{r.jina || r.full_name}</span>
                      <span className="text-xs font-normal text-slate-500">{r.cheo}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {!selectedId || !leader ? (
            <p className="text-sm text-slate-500">Chagua kiongozi kwenye orodha ya kushoto.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-[#0B1F3A]">{leader.jina || leader.full_name}</h3>
                  <p className="text-sm text-emerald-700">{leader.cheo}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className="rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs font-semibold text-[#0B1F3A]"
                  >
                    Hakiki kamili
                  </button>
                  <button
                    type="button"
                    disabled={certPdfBusy}
                    onClick={() => void onAppointmentCertPdf()}
                    className="rounded-xl border border-[#D4AF37]/60 bg-gradient-to-r from-[#0B1F3A] to-[#123C69] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {certPdfBusy ? "Cheti…" : "Cheti (PDF)"}
                  </button>
                  <button
                    type="button"
                    disabled={!props.canEdit || busy || pdfBusy}
                    onClick={() => void onPdf()}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 disabled:opacity-50"
                  >
                    {pdfBusy ? "PDF…" : "Pakua CV (PDF)"}
                  </button>
                  <button
                    type="button"
                    disabled={!props.canEdit || busy}
                    onClick={() => void onSave()}
                    className="rounded-xl bg-[#0B1F3A] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? "Inahifadhi…" : "Hifadhi wasifu"}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Picha & saini</h4>
                  <div className="flex gap-3">
                    <div className="relative h-24 w-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      {previewPhoto ? (
                        <ResponsiveLazyImage
                          src={previewPhoto}
                          alt="Picha ya kiongozi"

                          className="absolute inset-0 h-full w-full object-cover"
                          width={96}
                          height={96}
                          loading="lazy"
                        />
                      ) : (
                        <span className="p-2 text-[10px] text-slate-400">Hakuna picha</span>
                      )}
                    </div>
                    <div className="relative h-20 w-36 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      {previewSig ? (
                        <ResponsiveLazyImage
                          src={previewSig}
                          alt="Saini ya kiongozi"

                          className="absolute inset-0 h-full w-full object-cover"

                          width={144}
                          height={80}

                          loading="lazy"
                        />
                      ) : (
                        <span className="p-2 text-[10px] text-slate-400">Hakuna saini</span>
                      )}
                    </div>
                  </div>
                  {props.canEdit ? (
                    <div className="flex flex-wrap gap-2 text-xs">
                      <label className="cursor-pointer rounded-lg border border-slate-200 px-2 py-1 font-semibold hover:bg-slate-50">
                        Pakia picha
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => void uploadTo("photo", e.target.files?.[0] ?? null)} />
                      </label>
                      <label className="cursor-pointer rounded-lg border border-slate-200 px-2 py-1 font-semibold hover:bg-slate-50">
                        Pakia saini
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => void uploadTo("signature", e.target.files?.[0] ?? null)} />
                      </label>
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Wasifu (kina)</h4>
                  <Field label="Uraia" value={profile?.nationality ?? ""} onChange={(v) => setProfile((p) => ({ ...(p ?? emptyProfile(leader.id)), nationality: v || null }))} ro={!props.canEdit} />
                  <Field label="Ofisi inayo ripoti" value={profile?.reporting_office ?? ""} onChange={(v) => setProfile((p) => ({ ...(p ?? emptyProfile(leader.id)), reporting_office: v || null }))} ro={!props.canEdit} />
                </div>
              </div>

              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Wasifu / hadithi fupi
                <textarea
                  rows={4}
                  disabled={!props.canEdit}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm leading-relaxed"
                  style={{ lineHeight: 1.65 }}
                  value={profile?.biography ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...(p ?? emptyProfile(leader.id)), biography: e.target.value || null }))}
                />
              </label>

              <Collapsible title="Taarifa za msingi (church_viongozi)">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Jina" value={leader.jina} onChange={(v) => setLeader({ ...leader, jina: v })} ro={!props.canEdit} />
                  <Field label="Jina kamili" value={leader.full_name ?? ""} onChange={(v) => setLeader({ ...leader, full_name: v })} ro={!props.canEdit} />
                  <Field label="Cheo" value={leader.cheo} onChange={(v) => setLeader({ ...leader, cheo: v })} ro={!props.canEdit} />
                  <label className="grid gap-1 text-xs font-medium text-slate-700">
                    Leadership level (chaguo otomatiki kutoka muundo)
                    <select
                      disabled={!props.canEdit}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      value={leader.leadership_level ?? ""}
                      onChange={(e) => setLeader({ ...leader, leadership_level: e.target.value || null })}
                    >
                      <option value="">—</option>
                      {LEVEL_PRESETS.filter(Boolean).map((lv) => (
                        <option key={lv} value={lv}>
                          {lv}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field label="Assigned entity" value={leader.assigned_entity ?? ""} onChange={(v) => setLeader({ ...leader, assigned_entity: v })} ro={!props.canEdit} />
                  <Field label="Ngazi (orodha)" value={leader.ngazi} onChange={(v) => setLeader({ ...leader, ngazi: v })} ro={!props.canEdit} />
                  <Field label="Simu" value={leader.simu} onChange={(v) => setLeader({ ...leader, simu: v })} ro={!props.canEdit} />
                  <Field label="WhatsApp" value={leader.whatsapp ?? ""} onChange={(v) => setLeader({ ...leader, whatsapp: v || null })} ro={!props.canEdit} />
                  <Field label="Barua pepe" value={leader.email ?? ""} onChange={(v) => setLeader({ ...leader, email: v || null })} ro={!props.canEdit} />
                  <Field label="Anwani" value={leader.address ?? ""} onChange={(v) => setLeader({ ...leader, address: v || null })} ro={!props.canEdit} />
                  <Field label="Mkoa" value={leader.mkoa ?? ""} onChange={(v) => setLeader({ ...leader, mkoa: v || null })} ro={!props.canEdit} />
                  <Field label="Wilaya" value={leader.wilaya ?? ""} onChange={(v) => setLeader({ ...leader, wilaya: v || null })} ro={!props.canEdit} />
                  <Field label="Kata" value={leader.kata ?? ""} onChange={(v) => setLeader({ ...leader, kata: v || null })} ro={!props.canEdit} />
                  <label className="grid gap-1 text-xs font-medium text-slate-700">
                    Jinsia
                    <select
                      disabled={!props.canEdit}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      value={leader.gender ?? ""}
                      onChange={(e) => setLeader({ ...leader, gender: e.target.value || null })}
                    >
                      <option value="">—</option>
                      <option value="male">Meume</option>
                      <option value="female">Mke</option>
                      <option value="other">Nyingine</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-medium text-slate-700">
                    Tarehe ya kuzaliwa
                    <input
                      type="date"
                      disabled={!props.canEdit}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      value={(leader.date_of_birth ?? "").slice(0, 10)}
                      onChange={(e) => setLeader({ ...leader, date_of_birth: e.target.value || null })}
                    />
                  </label>
                  <Field label="NIDA" value={leader.national_id ?? ""} onChange={(v) => setLeader({ ...leader, national_id: v || null })} ro={!props.canEdit} />
                  <Field label="Pasipoti" value={leader.passport_number ?? ""} onChange={(v) => setLeader({ ...leader, passport_number: v || null })} ro={!props.canEdit} />
                  <Field label="Kitambulisho cha mwanachama" value={leader.church_member_id ?? ""} onChange={(v) => setLeader({ ...leader, church_member_id: v || null })} ro={!props.canEdit} />
                </div>
              </Collapsible>

              <Collapsible title="Muundo & vituo">
                <div className="mb-3 grid gap-2 rounded-lg bg-slate-50/90 px-3 py-2 text-xs text-slate-700 md:grid-cols-3">
                  <div>
                    <span className="font-semibold text-slate-500">Dayosisi</span>
                    <p className="font-medium text-slate-900">{leader.dayosisi?.trim() || "—"}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Jimbo</span>
                    <p className="font-medium text-slate-900">{leader.jimbo?.trim() || "—"}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Tawi</span>
                    <p className="font-medium text-slate-900">{leader.tawi?.trim() || "—"}</p>
                  </div>
                </div>
                <p className="mb-2 text-[11px] leading-relaxed text-slate-500">
                  Majina hapo juu yanatoka kwenye muundo (IDs). Idara / huduma / taasisi / jumuiya hapa chini ni maelezo ya ziada kwenye rekodi.
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Idara" value={leader.idara_name ?? ""} onChange={(v) => setLeader({ ...leader, idara_name: v || null })} ro={!props.canEdit} />
                  <Field label="Huduma" value={leader.huduma_name ?? ""} onChange={(v) => setLeader({ ...leader, huduma_name: v || null })} ro={!props.canEdit} />
                  <Field label="Taasisi" value={leader.taasisi_name ?? ""} onChange={(v) => setLeader({ ...leader, taasisi_name: v || null })} ro={!props.canEdit} />
                  <Field label="Jumuiya" value={leader.jumuiya_name ?? ""} onChange={(v) => setLeader({ ...leader, jumuiya_name: v || null })} ro={!props.canEdit} />
                </div>
              </Collapsible>

              <Collapsible title="Uteuzi, muda & hali">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-xs font-medium text-slate-700">
                    Hali ya muda (term)
                    <select
                      disabled={!props.canEdit}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      value={leader.term_status ?? "active"}
                      onChange={(e) =>
                        setLeader({
                          ...leader,
                          term_status: e.target.value as NonNullable<KiongoziRecord["term_status"]>,
                        })
                      }
                    >
                      <option value="active">Hai</option>
                      <option value="pending">Inasubiri</option>
                      <option value="suspended">Imesitishwa</option>
                      <option value="ended">Imeisha</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-medium text-slate-700">
                    Hali ya rekodi
                    <select
                      disabled={!props.canEdit}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      value={leader.status}
                      onChange={(e) => setLeader({ ...leader, status: e.target.value as KiongoziRecord["status"] })}
                    >
                      <option value="Active">Hai (Active)</option>
                      <option value="Pending">Inasubiri</option>
                      <option value="Inactive">Isiyotumika</option>
                      <option value="Archived">Archivu</option>
                      <option value="Needs Review">Mapitio</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-medium text-slate-700">
                    Tarehe ya kuanza
                    <input
                      type="date"
                      disabled={!props.canEdit}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      value={(leader.start_date ?? "").slice(0, 10)}
                      onChange={(e) => setLeader({ ...leader, start_date: e.target.value || null })}
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-medium text-slate-700">
                    Tarehe ya mwisho
                    <input
                      type="date"
                      disabled={!props.canEdit}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      value={(leader.end_date ?? "").slice(0, 10)}
                      onChange={(e) => setLeader({ ...leader, end_date: e.target.value || null })}
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-medium text-slate-700 md:col-span-2">
                    Tarehe ya uteuzi
                    <input
                      type="date"
                      disabled={!props.canEdit}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      value={(leader.appointment_date ?? "").slice(0, 10)}
                      onChange={(e) => setLeader({ ...leader, appointment_date: e.target.value || null })}
                    />
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 md:col-span-2">
                    <input
                      type="checkbox"
                      disabled={!props.canEdit}
                      className="h-4 w-4 rounded border-slate-300"
                      checked={!!leader.former_leader}
                      onChange={(e) => setLeader({ ...leader, former_leader: e.target.checked })}
                    />
                    Kiongozi wa zamani (former)
                  </label>
                  <div className="md:col-span-2">
                    <Field
                      label="Sababu ya kuondoka / mwisho"
                      value={leader.reason_for_leaving ?? ""}
                      onChange={(v) => setLeader({ ...leader, reason_for_leaving: v || null })}
                      ro={!props.canEdit}
                    />
                  </div>
                </div>
              </Collapsible>

              <Collapsible title="Muhtasari wa maandishi (rekodi kuu)">
                <div className="grid gap-3 md:grid-cols-2">
                  <AreaField
                    label="Muhtasari wa elimu"
                    value={leader.education_summary ?? ""}
                    onChange={(v) => setLeader({ ...leader, education_summary: v || null })}
                    ro={!props.canEdit}
                    rows={3}
                  />
                  <AreaField
                    label="Mafunzo ya theologia"
                    value={leader.theology_training ?? ""}
                    onChange={(v) => setLeader({ ...leader, theology_training: v || null })}
                    ro={!props.canEdit}
                    rows={3}
                  />
                  <AreaField
                    label="Ujuzi wa kitaalamu"
                    value={leader.professional_skills ?? ""}
                    onChange={(v) => setLeader({ ...leader, professional_skills: v || null })}
                    ro={!props.canEdit}
                    rows={3}
                  />
                  <AreaField
                    label="Muhtasari wa vyeti"
                    value={leader.certificates_summary ?? ""}
                    onChange={(v) => setLeader({ ...leader, certificates_summary: v || null })}
                    ro={!props.canEdit}
                    rows={3}
                  />
                  <AreaField
                    label="Karama za huduma"
                    value={leader.ministry_gifts ?? ""}
                    onChange={(v) => setLeader({ ...leader, ministry_gifts: v || null })}
                    ro={!props.canEdit}
                    rows={3}
                  />
                  <AreaField
                    label="Uzoefu wa huduma (maandishi)"
                    value={leader.ministry_experience ?? ""}
                    onChange={(v) => setLeader({ ...leader, ministry_experience: v || null })}
                    ro={!props.canEdit}
                    rows={3}
                  />
                </div>
              </Collapsible>

              <Collapsible title="Maelezo & saini ya PDF">
                <div className="grid gap-3 md:grid-cols-2">
                  <AreaField
                    label="Maelezo ya jumla"
                    value={leader.notes ?? ""}
                    onChange={(v) => setLeader({ ...leader, notes: v || null })}
                    ro={!props.canEdit}
                    rows={3}
                  />
                  <AreaField
                    label="Maelezo ya ndani (wasimamizi)"
                    value={leader.internal_notes ?? ""}
                    onChange={(v) => setLeader({ ...leader, internal_notes: v || null })}
                    ro={!props.canEdit}
                    rows={3}
                  />
                  <div className="md:col-span-2">
                    <AreaField
                      label="Historia ya mapitio / audit"
                      value={leader.audit_notes ?? ""}
                      onChange={(v) => setLeader({ ...leader, audit_notes: v || null })}
                      ro={!props.canEdit}
                      rows={2}
                    />
                  </div>
                  <Field
                    label="Jina la mtoaji wa PDF"
                    value={leader.pdf_issued_by_name ?? ""}
                    onChange={(v) => setLeader({ ...leader, pdf_issued_by_name: v || null })}
                    ro={!props.canEdit}
                    listId="official-signer-name-list"
                  />
                  <Field
                    label="Cheo cha mtoaji wa PDF"
                    value={leader.pdf_issued_by_title ?? ""}
                    onChange={(v) => setLeader({ ...leader, pdf_issued_by_title: v || null })}
                    ro={!props.canEdit}
                    listId="official-signer-title-list"
                  />
                  {officialSigners.length ? (
                    <p className="md:col-span-2 text-[11px] text-emerald-700">
                      Tumia mapendekezo ya viongozi rasmi wa taifa kwa signer consistency kwenye PDF.
                    </p>
                  ) : null}
                </div>
              </Collapsible>

              <Collapsible title="Uzoefu wa huduma">
                <RowsToolbar
                  disabled={!props.canEdit}
                  onAdd={() =>
                    setExperience((prev) => [
                      ...prev,
                      {
                        id: `tmp-${crypto.randomUUID()}`,
                        leader_id: leader.id,
                        start_year: new Date().getFullYear() - 4,
                        end_year: null,
                        institution: "",
                        position: "",
                        description: "",
                        sort_order: prev.length,
                      },
                    ])
                  }
                />
                <div className="space-y-2">
                  {experience.map((row, idx) => (
                    <div key={row.id} className="grid gap-2 rounded-lg border border-slate-100 p-2 md:grid-cols-6">
                      <NumField
                        label="Mwaka wa kuanza"
                        value={row.start_year}
                        onChange={(n) =>
                          setExperience((p) =>
                            p.map((x, i) => (i === idx ? { ...x, start_year: n === "" ? x.start_year : Math.trunc(Number(n) || 0) } : x))
                          )
                        }
                        ro={!props.canEdit}
                      />
                      <NumField
                        label="Mwaka wa mwisho (acha tupu = sasa)"
                        value={row.end_year ?? ""}
                        onChange={(n) =>
                          setExperience((p) =>
                            p.map((x, i) => (i === idx ? { ...x, end_year: n === "" ? null : Math.trunc(Number(n)) } : x))
                          )
                        }
                        ro={!props.canEdit}
                        optional
                      />
                      <Field label="Taasisi" value={row.institution} onChange={(v) => setExperience((p) => p.map((x, i) => (i === idx ? { ...x, institution: v } : x)))} ro={!props.canEdit} />
                      <Field label="Nafasi" value={row.position} onChange={(v) => setExperience((p) => p.map((x, i) => (i === idx ? { ...x, position: v } : x)))} ro={!props.canEdit} />
                      <Field label="Maelezo" value={row.description ?? ""} onChange={(v) => setExperience((p) => p.map((x, i) => (i === idx ? { ...x, description: v || null } : x)))} ro={!props.canEdit} />
                      {props.canEdit ? (
                        <button type="button" className="self-end text-xs text-rose-600" onClick={() => setExperience((p) => p.filter((_, i) => i !== idx))}>
                          Ondoa
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Collapsible>

              <Collapsible title="Elimu na mafunzo">
                <RowsToolbar disabled={!props.canEdit} onAdd={() => setEducation((prev) => [...prev, { id: `tmp-${crypto.randomUUID()}`, leader_id: leader.id, education_kind: "degree", institution: "", qualification: "", year: null, specialization: null, sort_order: prev.length }])} />
                <div className="space-y-2">
                  {education.map((row, idx) => (
                    <div key={row.id} className="grid gap-2 rounded-lg border border-slate-100 p-2 md:grid-cols-6">
                      <label className="grid gap-1 text-xs font-medium text-slate-700 md:col-span-1">
                        Aina
                        <select
                          disabled={!props.canEdit}
                          className="rounded border border-slate-200 px-2 py-1 text-sm"
                          value={row.education_kind}
                          onChange={(e) => setEducation((p) => p.map((x, i) => (i === idx ? { ...x, education_kind: e.target.value } : x)))}
                        >
                          {EDU_KINDS.map((o) => (
                            <option key={o.v} value={o.v}>
                              {o.l}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Field label="Stashahada" value={row.qualification} onChange={(v) => setEducation((p) => p.map((x, i) => (i === idx ? { ...x, qualification: v } : x)))} ro={!props.canEdit} />
                      <Field label="Taasisi" value={row.institution} onChange={(v) => setEducation((p) => p.map((x, i) => (i === idx ? { ...x, institution: v } : x)))} ro={!props.canEdit} />
                      <NumField
                        label="Mwaka"
                        value={row.year ?? ""}
                        onChange={(n) =>
                          setEducation((p) => p.map((x, i) => (i === idx ? { ...x, year: n === "" ? null : Math.trunc(Number(n)) } : x)))
                        }
                        ro={!props.canEdit}
                        optional
                      />
                      <Field label="Utaalamu" value={row.specialization ?? ""} onChange={(v) => setEducation((p) => p.map((x, i) => (i === idx ? { ...x, specialization: v || null } : x)))} ro={!props.canEdit} />
                      {props.canEdit ? (
                        <button type="button" className="self-end text-xs text-rose-600" onClick={() => setEducation((p) => p.filter((_, i) => i !== idx))}>
                          Ondoa
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Collapsible>

              <Collapsible title="Vyeti">
                <RowsToolbar disabled={!props.canEdit} onAdd={() => setCertificates((prev) => [...prev, { id: `tmp-${crypto.randomUUID()}`, leader_id: leader.id, certificate_name: "", issuer: null, year: null, notes: null, document_storage_path: null, sort_order: prev.length }])} />
                <div className="space-y-2">
                  {certificates.map((row, idx) => (
                    <div key={row.id} className="flex flex-col gap-2 rounded-lg border border-slate-100 p-3 md:flex-row md:flex-wrap md:items-end">
                      <div className="grid flex-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
                        <Field label="Jina la cheti" value={row.certificate_name} onChange={(v) => setCertificates((p) => p.map((x, i) => (i === idx ? { ...x, certificate_name: v } : x)))} ro={!props.canEdit} />
                        <Field label="Mtoleaji" value={row.issuer ?? ""} onChange={(v) => setCertificates((p) => p.map((x, i) => (i === idx ? { ...x, issuer: v || null } : x)))} ro={!props.canEdit} />
                        <NumField
                          label="Mwaka"
                          value={row.year ?? ""}
                          onChange={(n) =>
                            setCertificates((p) => p.map((x, i) => (i === idx ? { ...x, year: n === "" ? null : Math.trunc(Number(n)) } : x)))
                          }
                          ro={!props.canEdit}
                          optional
                        />
                        <Field label="Maelezo" value={row.notes ?? ""} onChange={(v) => setCertificates((p) => p.map((x, i) => (i === idx ? { ...x, notes: v || null } : x)))} ro={!props.canEdit} />
                      </div>
                      {props.canEdit ? (
                        <div className="flex flex-wrap gap-2">
                          <label className="cursor-pointer rounded border border-slate-200 px-2 py-1 text-xs font-semibold">
                            Pakia hati
                            <input type="file" className="hidden" onChange={(e) => void uploadTo("cert", e.target.files?.[0] ?? null, { certIndex: idx })} />
                          </label>
                          <button type="button" className="text-xs text-rose-600" onClick={() => setCertificates((p) => p.filter((_, i) => i !== idx))}>
                            Ondoa
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Collapsible>

              <Collapsible title="Ujuzi & karama">
                <RowsToolbar disabled={!props.canEdit} onAdd={() => setSkills((prev) => [...prev, { id: `tmp-${crypto.randomUUID()}`, leader_id: leader.id, skill_category: "leadership", label: "", sort_order: prev.length }])} />
                <div className="space-y-2">
                  {skills.map((row, idx) => (
                    <div key={row.id} className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-100 p-2">
                      <label className="grid gap-1 text-xs font-medium text-slate-700">
                        Kundi
                        <select
                          disabled={!props.canEdit}
                          className="rounded border border-slate-200 px-2 py-1 text-sm"
                          value={row.skill_category}
                          onChange={(e) => setSkills((p) => p.map((x, i) => (i === idx ? { ...x, skill_category: e.target.value } : x)))}
                        >
                          {SKILL_CATS.map((o) => (
                            <option key={o.v} value={o.v}>
                              {o.l}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="min-w-[200px] flex-1">
                        <Field label="Maelezo" value={row.label} onChange={(v) => setSkills((p) => p.map((x, i) => (i === idx ? { ...x, label: v } : x)))} ro={!props.canEdit} />
                      </div>
                      {props.canEdit ? (
                        <button type="button" className="text-xs text-rose-600" onClick={() => setSkills((p) => p.filter((_, i) => i !== idx))}>
                          Ondoa
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Collapsible>

              <Collapsible title="CV asili (faili) + viambatanisho">
                {props.canEdit ? (
                  <label className="mb-2 inline-block cursor-pointer rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold">
                    Pakia CV (PDF / DOC)
                    <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => void uploadTo("cv", e.target.files?.[0] ?? null)} />
                  </label>
                ) : null}
                {profile?.original_cv_file_name ? <p className="text-xs text-slate-600">Imepakiwa: {profile.original_cv_file_name}</p> : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="grid gap-1 text-xs font-medium text-slate-700">
                    Aina ya kiambatanisho
                    <select
                      className="rounded border border-slate-200 px-2 py-1 text-sm"
                      value={attachKindPick}
                      onChange={(e) => setAttachKindPick(e.target.value)}
                    >
                      {ATT_KINDS.map((o) => (
                        <option key={o.v} value={o.v}>
                          {o.l}
                        </option>
                      ))}
                    </select>
                  </label>
                  {props.canEdit ? (
                    <label className="mt-5 cursor-pointer rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold md:mt-0">
                      Ongeza kiambatanisho
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          void uploadTo("attach", e.target.files?.[0] ?? null, { attachmentKind: attachKindPick });
                          e.target.value = "";
                        }}
                      />
                    </label>
                  ) : null}
                </div>
                <ul className="mt-2 list-inside list-disc text-xs text-slate-600">
                  {attachments.map((a) => (
                    <li key={a.id}>
                      {a.attachment_kind}: {a.file_name}
                    </li>
                  ))}
                </ul>
              </Collapsible>
            </>
          )}
        </div>
      </div>
      <datalist id="official-signer-name-list">
        {officialSigners.map((s) => (
          <option key={`name-${s.full_name}`} value={s.full_name} />
        ))}
      </datalist>
      <datalist id="official-signer-title-list">
        {officialSigners.map((s) => (
          <option key={`title-${s.title}`} value={s.title} />
        ))}
      </datalist>

      <LeadershipDocumentPreviewModal
        open={previewOpen && !!leader}
        onClose={() => setPreviewOpen(false)}
        title={leader ? (leader.jina || leader.full_name || "Wasifu") : "Hakiki"}
        preview={
          leader
            ? kiongoziToPreviewProps(leader, {
                logoUrl,
                photoUrl: previewPhoto || leader.photo_url,
                biography: profile?.biography || leader.biography || leader.notes,
                kind: "cv",
              })
            : { fullName: "—", titleSw: "—" }
        }
        pdfBusy={pdfBusy}
        onDownloadPdf={leader ? async () => { await onPdf(); } : undefined}
        onSaveDraft={
          leader && props.canEdit
            ? () => {
                void onSave();
              }
            : undefined
        }
      />
    </div>
  );
}

function Collapsible(props: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-slate-100">
      <button type="button" className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-bold text-[#0B1F3A]" onClick={() => setOpen((o) => !o)}>
        {props.title}
        <span className="text-xs font-normal text-slate-400">{open ? "−" : "+"}</span>
      </button>
      {open ? <div className="space-y-2 border-t border-slate-100 px-3 py-3">{props.children}</div> : null}
    </div>
  );
}

function RowsToolbar(props: { disabled: boolean; onAdd: () => void }) {
  return (
    <div className="mb-2 flex justify-end">
      <button type="button" disabled={props.disabled} onClick={props.onAdd} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800 disabled:opacity-50">
        + Safu mpya
      </button>
    </div>
  );
}

function Field(props: { label: string; value: string; onChange: (v: string) => void; ro: boolean; listId?: string }) {
  return (
    <label className="grid gap-1 text-xs font-medium text-slate-700">
      {props.label}
      <input
        className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
        value={props.value}
        disabled={props.ro}
        list={props.listId}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </label>
  );
}

function AreaField(props: { label: string; value: string; onChange: (v: string) => void; ro: boolean; rows?: number }) {
  return (
    <label className="grid gap-1 text-xs font-medium text-slate-700">
      {props.label}
      <textarea
        rows={props.rows ?? 3}
        disabled={props.ro}
        className="resize-y rounded-lg border border-slate-200 px-2 py-1.5 text-sm leading-relaxed"
        style={{ lineHeight: 1.55 }}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </label>
  );
}

function NumField(props: {
  label: string;
  value: number | "" | string;
  onChange: (v: number | "") => void;
  ro: boolean;
  /** Ruhusu uga tupu (null kwenye DB). */
  optional?: boolean;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-slate-700">
      {props.label}
      <input
        type="number"
        className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
        value={props.value === "" ? "" : props.value}
        disabled={props.ro}
        placeholder={props.optional ? "Sasa / tupu" : undefined}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") props.onChange("");
          else props.onChange(Number(raw));
        }}
      />
    </label>
  );
}
