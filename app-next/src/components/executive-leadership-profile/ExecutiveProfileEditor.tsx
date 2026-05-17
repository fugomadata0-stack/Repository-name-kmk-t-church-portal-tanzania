import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, FileBadge2, Loader2, Save, Shield } from "lucide-react";
import type { LeadershipEducationCatalogRow, LeadershipRoleCatalogRow } from "../../services/leadershipCredentialsEngineService";
import type { ExecutiveProfileBundle } from "../../services/executiveLeadershipProfileService";
import { resolveCheoFromRole } from "../../services/executiveLeadershipProfileService";
import { JIMBO_LEADER_VARIANTS } from "../../lib/executiveLeadershipProfile/hierarchyConfig";
import { computeAgeFromBirthDate, computeYearsBetween } from "../../lib/executiveLeadershipProfile/profileCalculations";
import {
  educationRowsFromCatalogKeys,
  selectedKeysFromEducationRows,
} from "../../lib/executiveLeadershipProfile/educationCatalogMap";
import type { LeadershipCvBundle } from "../../types";
import { EducationCatalogSelect } from "./EducationCatalogSelect";
import { LeadershipDocumentUploadCenter, type LeadershipUploadKind } from "../executive/LeadershipDocumentUploadCenter";
import { LeadershipApprovalTimeline } from "../leadership-credentials/LeadershipApprovalTimeline";
import type { OfficialCertificateRow } from "../../services/leadershipOfficialCertificateService";

const GENDERS = ["Mwanaume", "Mwanamke"] as const;
const MARITAL = ["", "Single", "Married", "Widowed", "Divorced"] as const;

type Props = {
  bundle: ExecutiveProfileBundle | null;
  loading: boolean;
  roles: LeadershipRoleCatalogRow[];
  educationCatalog: LeadershipEducationCatalogRow[];
  roleKey: string;
  jimboVariant: string;
  canEdit: boolean;
  canExport: boolean;
  saving: boolean;
  uploadBusy: boolean;
  latestCert: OfficialCertificateRow | null;
  onRoleKeyChange: (key: string) => void;
  onJimboVariantChange: (v: string) => void;
  onSave: (draft: ExecutiveProfileDraft) => Promise<void>;
  onUpload: (kind: LeadershipUploadKind, file: File) => Promise<void>;
  onOpenCredentials: () => void;
  onGeneratePdf: () => void;
};

export type ExecutiveProfileDraft = {
  fullName: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  mkoa: string;
  wilaya: string;
  baptized: boolean;
  baptismDate: string;
  maritalStatus: string;
  serviceStart: string;
  serviceEnd: string;
  yearsMinistry: number | null;
  yearsPosition: number | null;
  educationKeys: string[];
  cvBundle: LeadershipCvBundle | null;
};

function emptyDraft(): ExecutiveProfileDraft {
  return {
    fullName: "",
    gender: "",
    dateOfBirth: "",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    mkoa: "",
    wilaya: "",
    baptized: false,
    baptismDate: "",
    maritalStatus: "",
    serviceStart: "",
    serviceEnd: "",
    yearsMinistry: null,
    yearsPosition: null,
    educationKeys: [],
    cvBundle: null,
  };
}

function draftFromBundle(
  bundle: ExecutiveProfileBundle,
  educationCatalog: LeadershipEducationCatalogRow[],
): ExecutiveProfileDraft {
  const L = bundle.leader;
  const E = bundle.extended;
  const edu = bundle.cvBundle?.education ?? [];
  const start = E?.position_started_at?.slice(0, 10) ?? L.start_date ?? "";
  const end = E?.position_ended_at?.slice(0, 10) ?? L.end_date ?? "";
  return {
    fullName: L.full_name || L.jina || "",
    gender: E?.gender ?? L.gender ?? "",
    dateOfBirth: L.date_of_birth ?? "",
    phone: L.simu ?? "",
    whatsapp: E?.whatsapp ?? L.whatsapp ?? "",
    email: L.email ?? "",
    address: L.address ?? "",
    mkoa: L.mkoa ?? "",
    wilaya: L.wilaya ?? "",
    baptized: E?.baptized === true,
    baptismDate: E?.baptism_date?.slice(0, 10) ?? "",
    maritalStatus: E?.marital_status ?? "",
    serviceStart: start,
    serviceEnd: end,
    yearsMinistry: bundle.computedYearsMinistry,
    yearsPosition: bundle.computedYearsPosition,
    educationKeys: selectedKeysFromEducationRows(edu, educationCatalog),
    cvBundle: bundle.cvBundle,
  };
}

export function ExecutiveProfileEditor({
  bundle,
  loading,
  roles,
  educationCatalog,
  roleKey,
  jimboVariant,
  canEdit,
  canExport,
  saving,
  uploadBusy,
  latestCert,
  onRoleKeyChange,
  onJimboVariantChange,
  onSave,
  onUpload,
  onOpenCredentials,
  onGeneratePdf,
}: Props) {
  const [draft, setDraft] = useState<ExecutiveProfileDraft>(emptyDraft());

  useEffect(() => {
    if (!bundle) {
      setDraft(emptyDraft());
      return;
    }
    setDraft(draftFromBundle(bundle, educationCatalog));
  }, [bundle, educationCatalog]);

  const age = useMemo(() => computeAgeFromBirthDate(draft.dateOfBirth), [draft.dateOfBirth]);
  const yearsMinistry = useMemo(
    () => draft.yearsMinistry ?? computeYearsBetween(draft.serviceStart, draft.serviceEnd || undefined),
    [draft.yearsMinistry, draft.serviceStart, draft.serviceEnd],
  );
  const yearsPosition = useMemo(
    () => draft.yearsPosition ?? computeYearsBetween(draft.serviceStart, draft.serviceEnd || undefined),
    [draft.yearsPosition, draft.serviceStart, draft.serviceEnd],
  );

  const selectedRole = roles.find((r) => r.role_key === roleKey) ?? null;
  const cheoPreview = selectedRole ? resolveCheoFromRole(selectedRole, jimboVariant) : bundle?.leader.cheo ?? "";

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-sm text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        Inapakia wasifu…
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-12 text-center text-sm text-slate-600">
        Chagua kiongozi kutoka bodi ya nafasi au orodha ili kuhariri wasifu.
      </div>
    );
  }

  function patch<K extends keyof ExecutiveProfileDraft>(key: K, value: ExecutiveProfileDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function onEducationKeysChange(keys: string[]) {
    const leaderId = bundle!.leader.id;
    const existing = draft.cvBundle;
    const education = educationRowsFromCatalogKeys(leaderId, educationCatalog, keys);
    const cvBundle: LeadershipCvBundle = existing
      ? { ...existing, education }
      : {
          profile: null,
          experience: [],
          education,
          certificates: [],
          skills: [],
          attachments: [],
        };
    setDraft((d) => ({ ...d, educationKeys: keys, cvBundle }));
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#0B1F3A]/10 bg-gradient-to-r from-[#0B1F3A] to-[#123C69] px-4 py-3 text-white shadow">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200/90">Wasifu wa Uongozi</p>
          <h2 className="text-lg font-bold">{draft.fullName || bundle.leader.jina}</h2>
          <p className="text-xs text-white/80">{cheoPreview}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onSave(draft)}
            disabled={!canEdit || saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-2 text-xs font-bold text-[#0B1F3A] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Hifadhi
          </button>
          <button
            type="button"
            onClick={onOpenCredentials}
            className="rounded-xl border border-white/30 px-3 py-2 text-xs font-semibold hover:bg-white/10"
          >
            Cheti & CV
          </button>
          <button
            type="button"
            onClick={onGeneratePdf}
            disabled={!canExport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 px-3 py-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-50"
          >
            <FileBadge2 className="h-4 w-4" />
            PDF
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-[#0B1F3A]">Taarifa za msingi</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-[11px] font-semibold text-slate-600">Jina kamili</span>
              <input
                value={draft.fullName}
                disabled={!canEdit}
                onChange={(e) => patch("fullName", e.target.value)}
                className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-slate-600">Jinsia</span>
              <select
                value={draft.gender}
                disabled={!canEdit}
                onChange={(e) => patch("gender", e.target.value)}
                className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
              >
                <option value="">—</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-slate-600">Tarehe ya kuzaliwa</span>
              <input
                type="date"
                value={draft.dateOfBirth}
                disabled={!canEdit}
                onChange={(e) => patch("dateOfBirth", e.target.value)}
                className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
              />
              {age != null ? (
                <p className="mt-1 text-[10px] text-emerald-700">Umri (auto): {age} miaka</p>
              ) : null}
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-slate-600">Simu</span>
              <input
                value={draft.phone}
                disabled={!canEdit}
                onChange={(e) => patch("phone", e.target.value)}
                className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-slate-600">WhatsApp</span>
              <input
                value={draft.whatsapp}
                disabled={!canEdit}
                onChange={(e) => patch("whatsapp", e.target.value)}
                className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[11px] font-semibold text-slate-600">Barua pepe</span>
              <input
                type="email"
                value={draft.email}
                disabled={!canEdit}
                onChange={(e) => patch("email", e.target.value)}
                className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[11px] font-semibold text-slate-600">Anwani</span>
              <input
                value={draft.address}
                disabled={!canEdit}
                onChange={(e) => patch("address", e.target.value)}
                className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-slate-600">Mkoa</span>
              <input
                value={draft.mkoa}
                disabled={!canEdit}
                onChange={(e) => patch("mkoa", e.target.value)}
                className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-slate-600">Wilaya</span>
              <input
                value={draft.wilaya}
                disabled={!canEdit}
                onChange={(e) => patch("wilaya", e.target.value)}
                className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#0B1F3A]">
            <Shield className="h-4 w-4" />
            Cheo & huduma
          </h3>
          <div className="grid gap-3">
            <label className="block">
              <span className="text-[11px] font-semibold text-slate-600">Nafasi (catalog)</span>
              <select
                value={roleKey}
                disabled={!canEdit}
                onChange={(e) => onRoleKeyChange(e.target.value)}
                className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
              >
                <option value="">—</option>
                {roles.map((r) => (
                  <option key={r.role_key} value={r.role_key}>
                    {r.title_sw}
                  </option>
                ))}
              </select>
            </label>
            {roleKey === "mkuu_wa_jimbo" ? (
              <label className="block">
                <span className="text-[11px] font-semibold text-slate-600">Aina ya Mkuu wa Jimbo</span>
                <select
                  value={jimboVariant}
                  disabled={!canEdit}
                  onChange={(e) => onJimboVariantChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                >
                  <option value="">—</option>
                  {JIMBO_LEADER_VARIANTS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.baptized}
                disabled={!canEdit}
                onChange={(e) => patch("baptized", e.target.checked)}
              />
              Amebatizwa?
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-slate-600">Tarehe ya ubatizo</span>
              <input
                type="date"
                value={draft.baptismDate}
                disabled={!canEdit}
                onChange={(e) => patch("baptismDate", e.target.value)}
                className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-slate-600">Hali ya ndoa</span>
              <select
                value={draft.maritalStatus}
                disabled={!canEdit}
                onChange={(e) => patch("maritalStatus", e.target.value)}
                className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
              >
                {MARITAL.map((m) => (
                  <option key={m || "—"} value={m}>
                    {m || "—"}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-slate-600">Mwanzo wa huduma</span>
              <input
                type="date"
                value={draft.serviceStart}
                disabled={!canEdit}
                onChange={(e) => patch("serviceStart", e.target.value)}
                className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-slate-600">Mwisho wa huduma</span>
              <input
                type="date"
                value={draft.serviceEnd}
                disabled={!canEdit}
                onChange={(e) => patch("serviceEnd", e.target.value)}
                className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
              />
            </label>
            <div className="flex flex-wrap gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs">
              <span className="inline-flex items-center gap-1 text-[#123C69]">
                <Calendar className="h-3.5 w-3.5" />
                Miaka ya huduma: <strong>{yearsMinistry ?? "—"}</strong>
              </span>
              <span>
                Miaka katika nafasi: <strong>{yearsPosition ?? "—"}</strong>
              </span>
            </div>
          </div>
        </section>
      </div>

      <EducationCatalogSelect
        catalog={educationCatalog}
        selectedKeys={draft.educationKeys}
        disabled={!canEdit}
        onChange={onEducationKeysChange}
      />

      <LeadershipDocumentUploadCenter
        kinds={["photo", "signature", "seal"]}
        disabled={!canEdit}
        busy={uploadBusy}
        onUpload={onUpload}
      />

      <LeadershipApprovalTimeline certificate={latestCert} />
    </motion.div>
  );
}
