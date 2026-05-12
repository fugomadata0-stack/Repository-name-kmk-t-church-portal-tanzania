import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  FileStack,
  IdCard,
  ImageIcon,
  Languages,
  LayoutDashboard,
  Mail,
  MessageSquareText,
  Paintbrush,
  PanelBottom,
  Sparkles,
} from "lucide-react";
import { usePortal } from "../../context/PortalContext";
import { LeadershipCvEnginePanel } from "./LeadershipCvEnginePanel";
import { SettingsSupabaseBanner } from "./SettingsSupabaseBanner";
import { uploadSitePublicAsset } from "../../lib/siteAssetsUpload";
import {
  emptyMasterSettings,
  fetchMasterSettings,
  normalizeSettingsError,
  readMasterSettingsCache,
  saveMasterSettings,
  type MasterSettingsRow,
  validateEmail,
  validateHexColor,
  validatePhone,
} from "../../services/masterSettingsService";
import { dispatchPortalReloadMetrics, KMT_MASTER_SETTINGS_UPDATED_EVENT } from "../../lib/portalEvents";

type TabKey =
  | "identity"
  | "branding"
  | "theme"
  | "exports"
  | "email_templates"
  | "sms_templates"
  | "language"
  | "dashboard"
  | "footer"
  | "leadership_cv";

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "identity", label: "Utambulisho wa KMK(T)", icon: Building2 },
  { key: "branding", label: "Nembo na vitambulisho vya kuona", icon: ImageIcon },
  { key: "theme", label: "Rangi na mandhari", icon: Paintbrush },
  { key: "exports", label: "PDF · Excel · Chapishi", icon: FileStack },
  { key: "email_templates", label: "Mifano ya barua pepe", icon: Mail },
  { key: "sms_templates", label: "Mifano ya SMS", icon: MessageSquareText },
  { key: "language", label: "Mipangilio ya lugha", icon: Languages },
  { key: "dashboard", label: "Chaguo-msingi za dashibodi", icon: LayoutDashboard },
  { key: "footer", label: "Kijachini cha mfumo", icon: PanelBottom },
  { key: "leadership_cv", label: "Wasifu na CV — Viongozi", icon: IdCard },
];

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

export function MasterSettingsCenterPanel() {
  const { pushToast, reportError, canPortalEditModule, canPortalManageSettingsModule, canPortalViewModule, logAudit } = usePortal();
  const canEdit = canPortalManageSettingsModule("mipangilio") && canPortalEditModule("mipangilio");
  const canCvTab = canPortalManageSettingsModule("mipangilio") && canPortalViewModule("viongozi");
  const canCvEdit = canCvTab && canPortalEditModule("mipangilio") && canPortalEditModule("viongozi");

  const [activeTab, setActiveTab] = useState<TabKey>("identity");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [form, setForm] = useState<MasterSettingsRow>(() => emptyMasterSettings());

  const load = useCallback(
    async (silent?: boolean) => {
      if (!silent) setLoading(true);
      try {
        const row = await fetchMasterSettings();
        setForm(row);
      } catch (err) {
        if (!silent) {
          reportError(err, "Master Settings — pakua");
          setForm(emptyMasterSettings());
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [reportError]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    const onRemote = () => setForm(readMasterSettingsCache());
    window.addEventListener(KMT_MASTER_SETTINGS_UPDATED_EVENT, onRemote);
    return () => window.removeEventListener(KMT_MASTER_SETTINGS_UPDATED_EVENT, onRemote);
  }, []);

  function updateIdentity<K extends keyof MasterSettingsRow["identity"]>(key: K, value: MasterSettingsRow["identity"][K]) {
    setForm((prev) => ({ ...prev, identity: { ...prev.identity, [key]: value } }));
  }

  function updateTheme<K extends keyof MasterSettingsRow["theme"]>(key: K, value: MasterSettingsRow["theme"][K]) {
    setForm((prev) => ({ ...prev, theme: { ...prev.theme, [key]: value } }));
  }

  function updateTemplates<K extends keyof MasterSettingsRow["templates"]>(key: K, value: MasterSettingsRow["templates"][K]) {
    setForm((prev) => ({ ...prev, templates: { ...prev.templates, [key]: value } }));
  }

  function validateBeforeSave(): string | null {
    if (!form.identity.official_name.trim()) return "Jina rasmi linahitajika.";
    if (!validateEmail(form.identity.email)) return "Barua pepe si sahihi.";
    if (!validatePhone(form.identity.phone)) return "Nambari ya simu si sahihi.";

    const colors = [
      form.theme.primary_color,
      form.theme.secondary_color,
      form.theme.accent_color,
      form.theme.background_color,
      form.theme.text_color,
    ];
    if (colors.some((c) => !validateHexColor(c))) return "Rangi zote lazima ziwe katika umbizo la HEX (#RRGGBB).";
    if (form.identity.language_ratio_sw + form.identity.language_ratio_en !== 100) return "Uwiano wa lugha lazima ujumlishwe hadi 100%.";
    if (form.identity.dashboard_refresh_interval_sec < 15) return "Muda wa kuonyesha upya wa dashibodi lazima uwe angalau sekunde 15.";
    if (form.identity.default_date_range_days < 1) return "Masafa ya tarehe chaguo-msingi lazima yawe angalau siku 1.";
    return null;
  }

  async function onUploadThemeAsset(
    key: "logo_url" | "favicon_url" | "letterhead_url" | "signature_image_url" | "seal_image_url",
    path: string,
    file: File | null
  ) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      pushToast("Aina ya faili hairuhusiwi. Tumia picha tu.", "error");
      return;
    }
    if (file.size > MAX_UPLOAD_SIZE) {
      pushToast("Faili ni kubwa sana. Kikomo ni 5MB.", "error");
      return;
    }

    setUploadingKey(key);
    try {
      const url = await uploadSitePublicAsset(path, file);
      updateTheme(key, url);
      pushToast("Picha imepakiwa kwenye Supabase Storage.", "success");
    } catch (err) {
      reportError(err, "Master Settings — upload");
    } finally {
      setUploadingKey(null);
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;

    const validationError = validateBeforeSave();
    if (validationError) {
      pushToast(validationError, "error");
      return;
    }

    setSaving(true);
    try {
      const saved = await saveMasterSettings(form);
      setForm(saved);
      await logAudit("master_settings_center_update", "portal_master_settings", undefined, {
        tab: activeTab,
      });

      window.dispatchEvent(new CustomEvent("kmt-portal-settings-updated"));
      dispatchPortalReloadMetrics();

      pushToast("Mipangilio mikuu yamehifadhiwa.", "success");
    } catch (err) {
      pushToast(normalizeSettingsError(err), "error");
      reportError(err, "Master Settings — hifadhi");
    } finally {
      setSaving(false);
    }
  }

  const previewStyle = useMemo(
    () => ({
      backgroundColor: form.theme.background_color,
      color: form.theme.text_color,
      borderColor: form.theme.primary_color,
    }),
    [form.theme.background_color, form.theme.text_color, form.theme.primary_color]
  );

  return (
    <section className="space-y-4">
      <SettingsSupabaseBanner />
      <header className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/35 bg-gradient-to-br from-[#0B1F3A] via-[#0c2442] to-[#123C69] p-6 text-white shadow-xl ring-1 ring-white/10">
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[#D4AF37]/12 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-16 left-1/4 h-36 w-36 rounded-full bg-sky-400/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200/95">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
              KMK(T) · Mipangilio mikuu
            </p>
            <h2 className="font-kmkt-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">Kituo cha utambulisho na uendeshaji</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-blue-100/95">
              Chanzo kimoja cha ukweli: utambulisho wa jumla, nembo, rangi, vichwa vya hati, mifano ya barua na SMS, lugha, na chaguo-msingi za dashibodi. Mabadiliko haya yanaonekana katika PDF, dashibodi na hati rasmi.
            </p>
          </div>
          <aside className="shrink-0 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs text-amber-50 backdrop-blur-sm">
            <p className="font-semibold text-amber-200">Utaratibu wa kitaasisi</p>
            <p className="mt-1.5 max-w-[16rem] leading-relaxed text-blue-100/85">
              Tumia sehemu za kushoto kama ramani: anza kwa Utambulisho, kisha Nembo na rangi, kabla ya mifano ya ujumbe.
            </p>
          </aside>
        </div>
      </header>

      {!canEdit ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Huna ruhusa ya kubadilisha mipangilio mikuu.
        </div>
      ) : null}

      {loading ? (
        <div
          className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-6 text-slate-600 shadow-sm"
          role="status"
          aria-live="polite"
        >
          <span className="inline-block h-9 w-9 shrink-0 animate-spin rounded-full border-2 border-[#0B1F3A] border-t-transparent" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-[#0B1F3A]">Inapakia mipangilio mikuu…</p>
            <p className="text-xs text-slate-500">Tunasoma rekodi kutoka Supabase (sekunde chache).</p>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => void onSave(e)}
          className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-md ring-1 ring-slate-100 sm:p-5"
        >
          <nav
            className="-mx-1 flex gap-2 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:thin] sm:flex-wrap sm:overflow-x-visible"
            aria-label="Sehemu za mipangilio mikuu"
          >
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={`flex min-w-max shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                    active
                      ? "bg-[#0B1F3A] text-white shadow-md ring-2 ring-amber-400/45 ring-offset-2 ring-offset-white"
                      : "border border-slate-200/90 bg-slate-50/80 text-slate-800 hover:border-amber-200/80 hover:bg-white"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? "text-amber-200" : "text-slate-500"}`} aria-hidden />
                  <span className="whitespace-nowrap">{t.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="rounded-xl border border-[#0B1F3A]/10 bg-gradient-to-r from-[#0B1F3A]/5 via-white to-[#D4AF37]/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0B1F3A]">Viwango vya uendeshaji (Pro)</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Mipangilio hii ni chanzo kimoja cha ukweli: taarifa za viongozi, nembo, PDF na CV zinasomwa moja kwa moja kutoka Supabase (data hai).
            </p>
          </div>

          {activeTab === "identity" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Jina rasmi *" value={form.identity.official_name} onChange={(v) => updateIdentity("official_name", v)} disabled={!canEdit} />
              <Field label="Jina fupi" value={form.identity.short_name} onChange={(v) => updateIdentity("short_name", v)} disabled={!canEdit} />
              <Field label="Kauli mbiu (motto)" value={form.identity.motto} onChange={(v) => updateIdentity("motto", v)} disabled={!canEdit} />
              <Field label="Anwani" value={form.identity.address} onChange={(v) => updateIdentity("address", v)} disabled={!canEdit} />
              <Field label="Simu" value={form.identity.phone} onChange={(v) => updateIdentity("phone", v)} disabled={!canEdit} />
              <Field label="Barua pepe" value={form.identity.email} onChange={(v) => updateIdentity("email", v)} disabled={!canEdit} />
              <Field label="Tovuti" value={form.identity.website} onChange={(v) => updateIdentity("website", v)} disabled={!canEdit} />
              <Field label="Nchi" value={form.identity.country} onChange={(v) => updateIdentity("country", v)} disabled={!canEdit} />
              <Field label="Ukanda wa saa (timezone)" value={form.identity.timezone} onChange={(v) => updateIdentity("timezone", v)} disabled={!canEdit} />
              <Field label="Maelezo ya usajili" value={form.identity.registration_info} onChange={(v) => updateIdentity("registration_info", v)} disabled={!canEdit} />
              <Field label="Maandishi ya muhuri rasmi" value={form.identity.official_seal_text} onChange={(v) => updateIdentity("official_seal_text", v)} disabled={!canEdit} />
            </div>
          ) : null}

          {activeTab === "branding" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <UploadField
                label="Nembo kuu (logo)"
                accept={IMAGE_ACCEPT}
                value={form.theme.logo_url}
                busy={uploadingKey === "logo_url"}
                onUpload={(f) => void onUploadThemeAsset("logo_url", "master/logo", f)}
                onChangeValue={(v) => updateTheme("logo_url", v)}
                disabled={!canEdit}
              />
              <UploadField
                label="Aikoni ya kivinjari (favicon)"
                accept={IMAGE_ACCEPT}
                value={form.theme.favicon_url}
                busy={uploadingKey === "favicon_url"}
                onUpload={(f) => void onUploadThemeAsset("favicon_url", "master/favicon", f)}
                onChangeValue={(v) => updateTheme("favicon_url", v)}
                disabled={!canEdit}
              />
              <UploadField
                label="Picha ya kichwa cha barua"
                accept={IMAGE_ACCEPT}
                value={form.theme.letterhead_url}
                busy={uploadingKey === "letterhead_url"}
                onUpload={(f) => void onUploadThemeAsset("letterhead_url", "master/letterhead", f)}
                onChangeValue={(v) => updateTheme("letterhead_url", v)}
                disabled={!canEdit}
              />
              <UploadField
                label="Picha ya saini"
                accept={IMAGE_ACCEPT}
                value={form.theme.signature_image_url}
                busy={uploadingKey === "signature_image_url"}
                onUpload={(f) => void onUploadThemeAsset("signature_image_url", "master/signature", f)}
                onChangeValue={(v) => updateTheme("signature_image_url", v)}
                disabled={!canEdit}
              />
              <UploadField
                label="Picha ya muhuri rasmi"
                accept={IMAGE_ACCEPT}
                value={form.theme.seal_image_url}
                busy={uploadingKey === "seal_image_url"}
                onUpload={(f) => void onUploadThemeAsset("seal_image_url", "master/seal", f)}
                onChangeValue={(v) => updateTheme("seal_image_url", v)}
                disabled={!canEdit}
              />
            </div>
          ) : null}

          {activeTab === "theme" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <ColorField label="Rangi kuu (primary)" value={form.theme.primary_color} onChange={(v) => updateTheme("primary_color", v)} disabled={!canEdit} />
              <ColorField label="Rangi ya pili (secondary)" value={form.theme.secondary_color} onChange={(v) => updateTheme("secondary_color", v)} disabled={!canEdit} />
              <ColorField label="Rangi ya msisitizo (dhahabu)" value={form.theme.accent_color} onChange={(v) => updateTheme("accent_color", v)} disabled={!canEdit} />
              <ColorField label="Rangi ya usuli" value={form.theme.background_color} onChange={(v) => updateTheme("background_color", v)} disabled={!canEdit} />
              <ColorField label="Rangi ya maandishi" value={form.theme.text_color} onChange={(v) => updateTheme("text_color", v)} disabled={!canEdit} />
              <div className="rounded-xl border p-3" style={previewStyle}>
                <p className="text-sm font-semibold">Hakiki ya mandhari</p>
                <p className="text-xs">Mtindo wa navy / dhahabu / nyeupe wa KMK(T) unaonekana hapa.</p>
              </div>
            </div>
          ) : null}

          {activeTab === "exports" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Kichwa cha PDF" value={form.theme.pdf_header_text} onChange={(v) => updateTheme("pdf_header_text", v)} disabled={!canEdit} />
              <Field label="Kichwa cha Excel" value={form.theme.excel_header_text} onChange={(v) => updateTheme("excel_header_text", v)} disabled={!canEdit} />
              <Field label="Kichwa cha chapisho" value={form.theme.print_header_text} onChange={(v) => updateTheme("print_header_text", v)} disabled={!canEdit} />
              <Field label="Kijachini cha mfumo (footer)" value={form.identity.system_footer} onChange={(v) => updateIdentity("system_footer", v)} disabled={!canEdit} />
            </div>
          ) : null}

          {activeTab === "email_templates" ? (
            <div className="grid gap-3">
              <TextAreaField label="Barua ya karibu (welcome)" value={form.templates.email_welcome} onChange={(v) => updateTemplates("email_welcome", v)} disabled={!canEdit} />
              <TextAreaField label="Barua ya kuweka upya nenosiri" value={form.templates.email_password_reset} onChange={(v) => updateTemplates("email_password_reset", v)} disabled={!canEdit} />
              <TextAreaField label="Barua ya idhini ya usajili" value={form.templates.email_signup_approval} onChange={(v) => updateTemplates("email_signup_approval", v)} disabled={!canEdit} />
              <TextAreaField label="Barua ya risiti ya fedha" value={form.templates.email_finance_receipt} onChange={(v) => updateTemplates("email_finance_receipt", v)} disabled={!canEdit} />
              <TextAreaField label="Barua ya idhini ya nyaraka" value={form.templates.email_document_approval} onChange={(v) => updateTemplates("email_document_approval", v)} disabled={!canEdit} />
            </div>
          ) : null}

          {activeTab === "sms_templates" ? (
            <div className="grid gap-3">
              <TextAreaField label="Ujumbe wa tahadhari (SMS)" value={form.templates.sms_alert} onChange={(v) => updateTemplates("sms_alert", v)} disabled={!canEdit} />
              <TextAreaField label="Ujumbe wa arifa za mfumo" value={form.templates.notification_message} onChange={(v) => updateTemplates("notification_message", v)} disabled={!canEdit} />
            </div>
          ) : null}

          {activeTab === "language" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Lugha ya kwanza (msimbo)" value={form.identity.language_primary} onChange={(v) => updateIdentity("language_primary", v)} disabled={!canEdit} />
              <Field label="Lugha ya pili (msimbo)" value={form.identity.language_secondary} onChange={(v) => updateIdentity("language_secondary", v)} disabled={!canEdit} />
              <NumberField label="Uwiano wa Kiswahili (%)" value={form.identity.language_ratio_sw} onChange={(v) => updateIdentity("language_ratio_sw", v)} disabled={!canEdit} min={0} max={100} />
              <NumberField label="Uwiano wa Kiingereza (%)" value={form.identity.language_ratio_en} onChange={(v) => updateIdentity("language_ratio_en", v)} disabled={!canEdit} min={0} max={100} />
            </div>
          ) : null}

          {activeTab === "dashboard" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={form.identity.show_kpi_cards}
                  onChange={(e) => updateIdentity("show_kpi_cards", e.target.checked)}
                  disabled={!canEdit}
                />
                Onyesha kadi za KPI
              </label>
              <NumberField
                label="Masafa ya tarehe chaguo-msingi (siku)"
                value={form.identity.default_date_range_days}
                onChange={(v) => updateIdentity("default_date_range_days", v)}
                disabled={!canEdit}
                min={1}
                max={3650}
              />
              <Field
                label="Chujio chaguo-msingi cha muundo"
                value={form.identity.default_hierarchy_filter}
                onChange={(v) => updateIdentity("default_hierarchy_filter", v)}
                disabled={!canEdit}
              />
              <NumberField
                label="Muda wa kuonyesha upya (sekunde)"
                value={form.identity.dashboard_refresh_interval_sec}
                onChange={(v) => updateIdentity("dashboard_refresh_interval_sec", v)}
                disabled={!canEdit}
                min={15}
                max={86400}
              />
            </div>
          ) : null}

          {activeTab === "footer" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Kijachini cha mfumo" value={form.identity.system_footer} onChange={(v) => updateIdentity("system_footer", v)} disabled={!canEdit} />
              <Field label="Kauli mbiu" value={form.identity.motto} onChange={(v) => updateIdentity("motto", v)} disabled={!canEdit} />
            </div>
          ) : null}

          {activeTab === "leadership_cv" ? (
            canCvTab ? (
              <LeadershipCvEnginePanel canEdit={canCvEdit} />
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Huna ruhusa ya kuona taarifa za viongozi (moduli ya Viongozi) katika mipangilio hii.
              </div>
            )
          ) : null}

          {activeTab !== "leadership_cv" ? (
            <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] leading-relaxed text-slate-500">
                Mabadiliko yanayoathiri PDF, nembo au lugha yanapaswa kuhifadhiwa hapa ili yatumike katika mfumo mzima.
              </p>
              <button
                type="submit"
                disabled={!canEdit || saving}
                className="shrink-0 rounded-xl bg-[#0B1F3A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123C69] disabled:opacity-50"
              >
                {saving ? "Inahifadhi…" : "Hifadhi mipangilio mikuu"}
              </button>
            </div>
          ) : (
            <p className="border-t border-slate-200 pt-3 text-xs leading-relaxed text-slate-500">
              Wasifu wa CV huhifadhiwa kwa kitufe <strong className="font-semibold text-slate-700">Hifadhi wasifu</strong> ndani ya sehemu ya Viongozi — si kitufe cha hifadhi cha mipangilio hii.
            </p>
          )}
        </form>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-800">
      {label}
      <input
        className="rounded-xl border border-slate-200 px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  disabled,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
  min?: number;
  max?: number;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-800">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        className="rounded-xl border border-slate-200 px-3 py-2"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value || 0))}
        disabled={disabled}
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-800">
      {label}
      <textarea
        rows={3}
        className="rounded-xl border border-slate-200 px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-800">
      {label}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          disabled={disabled}
          className="h-10 w-14 cursor-pointer rounded border border-slate-200 bg-white"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          disabled={disabled}
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2"
        />
      </div>
    </label>
  );
}

function UploadField({
  label,
  accept,
  value,
  busy,
  onUpload,
  onChangeValue,
  disabled,
}: {
  label: string;
  accept: string;
  value: string;
  busy: boolean;
  onUpload: (file: File | null) => void;
  onChangeValue: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-800">
      {label}
      <input type="file" accept={accept} onChange={(e) => onUpload(e.target.files?.[0] ?? null)} disabled={disabled || busy} />
      <input value={value} onChange={(e) => onChangeValue(e.target.value)} disabled={disabled} className="rounded-xl border border-slate-200 px-3 py-2" />
      {busy ? <span className="text-xs text-slate-500">Inapakia…</span> : null}
      {value ? (
        <div className="mt-1 overflow-hidden rounded border border-slate-200 bg-slate-50 p-1">
          <img src={value} alt={label} className="max-h-20 w-auto object-contain" loading="lazy" />
        </div>
      ) : null}
    </label>
  );
}

