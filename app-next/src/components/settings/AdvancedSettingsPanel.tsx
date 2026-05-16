import { useCallback, useEffect, useState } from "react";
import { usePortal } from "../../context/PortalContext";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import {
  extendedDefaults,
  fetchAttendanceSettings,
  fetchBackupSettings,
  fetchFinanceSettings,
  fetchLocalizationSettings,
  fetchMediaSettings,
  fetchNotificationSettings,
  fetchReportSettings,
  fetchSecurityPreferences,
  saveAttendanceSettings,
  saveBackupSettings,
  saveFinanceSettings,
  saveLocalizationSettings,
  saveMediaSettings,
  saveNotificationSettings,
  saveReportSettings,
  saveSecurityPreferences,
  type BackupSettingsRow,
  type FinanceSettingsRow,
  type NotificationSettingsRow,
} from "../../services/extendedSettingsService";
import { IncomeDistributionSettingsPanel } from "./IncomeDistributionSettingsPanel";
import { SettingsSupabaseBanner } from "./SettingsSupabaseBanner";

const sections = [
  { id: "localization", label: "Lugha & eneo" },
  { id: "notifications", label: "Arifa" },
  { id: "finance", label: "Fedha (portal)" },
  { id: "attendance", label: "Mahudhurio" },
  { id: "media", label: "Media" },
  { id: "reports", label: "Ripoti" },
  { id: "backup", label: "Backup" },
  { id: "security", label: "Usalama (mapendeleo)" },
] as const;

function parseJsonObject(text: string): Record<string, unknown> {
  let x: unknown;
  try {
    x = JSON.parse(text) as unknown;
  } catch {
    throw new Error("JSON si sahihi — hakikisha mabano na nukuu.");
  }
  if (typeof x !== "object" || x === null || Array.isArray(x)) {
    throw new Error("JSON lazima iwe object ({ ... }), si orodha.");
  }
  return x as Record<string, unknown>;
}

export function AdvancedSettingsPanel() {
  const { pushToast, reportError, logAudit, canPortalEditModule } = usePortal();
  const allowed = canPortalEditModule("mipangilio");
  const [boot, setBoot] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [locText, setLocText] = useState("");
  const [notif, setNotif] = useState<Omit<NotificationSettingsRow, "id" | "created_at">>({
    default_sms_sender: "",
    default_email_sender: "",
    default_priority: "normal",
    reminder_timings: "",
    retry_count: 3,
    failure_alerts_toggle: "on",
  });
  const [fin, setFin] = useState<Omit<FinanceSettingsRow, "id" | "created_at">>({
    default_currency: "TZS",
    default_payment_methods: "Cash, Bank, Mobile",
    auto_approval_threshold: "",
    receipt_prefix: "RCT-",
    finance_year_start: "",
    finance_year_end: "",
    hierarchy_share_percent: 35,
  });
  const [attText, setAttText] = useState("");
  const [mediaText, setMediaText] = useState("");
  const [repText, setRepText] = useState("");
  const [backup, setBackup] = useState<Omit<BackupSettingsRow, "id" | "created_at">>({
    auto_backup_toggle: "off",
    backup_frequency: "weekly",
    retention_period: "90",
    storage_location: "",
    restore_confirmation_toggle: "on",
  });
  const [secText, setSecText] = useState("");

  const loadAll = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setBoot(true);
      return;
    }
    setBoot(false);
    try {
      const [loc, n, f, a, m, r, b, s] = await Promise.all([
        fetchLocalizationSettings(),
        fetchNotificationSettings(),
        fetchFinanceSettings(),
        fetchAttendanceSettings(),
        fetchMediaSettings(),
        fetchReportSettings(),
        fetchBackupSettings(),
        fetchSecurityPreferences(),
      ]);
      setLocText(JSON.stringify(loc?.payload ?? extendedDefaults.localization(), null, 2));
      if (n) {
        setNotif({
          default_sms_sender: n.default_sms_sender,
          default_email_sender: n.default_email_sender,
          default_priority: n.default_priority,
          reminder_timings: n.reminder_timings,
          retry_count: n.retry_count ?? 3,
          failure_alerts_toggle: n.failure_alerts_toggle,
        });
      }
      if (f) {
        setFin({
          default_currency: f.default_currency,
          default_payment_methods: f.default_payment_methods,
          auto_approval_threshold: f.auto_approval_threshold,
          receipt_prefix: f.receipt_prefix,
          finance_year_start: f.finance_year_start?.slice(0, 10) ?? "",
          finance_year_end: f.finance_year_end?.slice(0, 10) ?? "",
          hierarchy_share_percent: f.hierarchy_share_percent ?? 35,
        });
      }
      setAttText(JSON.stringify(a?.payload ?? extendedDefaults.attendance(), null, 2));
      setMediaText(JSON.stringify(m?.payload ?? extendedDefaults.media(), null, 2));
      setRepText(JSON.stringify(r?.payload ?? extendedDefaults.report(), null, 2));
      if (b) {
        setBackup({
          auto_backup_toggle: b.auto_backup_toggle,
          backup_frequency: b.backup_frequency,
          retention_period: b.retention_period,
          storage_location: b.storage_location,
          restore_confirmation_toggle: b.restore_confirmation_toggle,
        });
      }
      setSecText(JSON.stringify(s?.payload ?? extendedDefaults.security(), null, 2));
    } catch (e) {
      reportError(e, "Mipangilio ya ziada — pakua");
    } finally {
      setBoot(true);
    }
  }, [reportError]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function saveSection(key: string, fn: () => Promise<void>) {
    if (!allowed) return;
    setBusy(key);
    try {
      await fn();
      await logAudit(`advanced_settings_${key}`, "settings_extended", undefined, { section: key });
      pushToast("Imehifadhiwa kwenye Supabase.", "success");
    } catch (e) {
      reportError(e, `Mipangilio ya ziada — hifadhi (${key})`);
    } finally {
      setBusy(null);
    }
  }

  if (!boot) {
    return (
      <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">Inapakia mipangilio ya ziada…</div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsSupabaseBanner />
      <header className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-[#0a1628] via-[#1a2f5c] to-[#0f2744] p-6 text-white shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Mipangilio kamili</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Mipangilio ya ziada (Advanced)</h2>
            <p className="mt-1 max-w-3xl text-sm text-blue-100">
              Jedwali za ziada za Phase 15: localization, notifications, finance prefs, attendance, media, report, backup,
              security — zote zimeunganishwa na Supabase (safu moja kwa kila jedwali).
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAll()}
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white"
          >
            Pakia upya zote
          </button>
        </div>
        <nav className="mt-4 flex flex-wrap gap-2">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-amber-100 hover:bg-white/15"
            >
              {s.label}
            </a>
          ))}
        </nav>
      </header>

      {!allowed && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Una ruhusa ya kuona tu. Badilisha jukumu kwenye Topbar ikiwa ni majaribio.
        </div>
      )}

      <section id="localization" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-[#fffefb] p-6 shadow-lg">
        <h3 className="text-lg font-bold text-[#0f1e46]">Lugha &amp; eneo</h3>
        <p className="text-sm text-slate-600">Jedwali: localization_settings (payload JSON)</p>
        <textarea
          className="mt-3 min-h-[160px] w-full rounded-xl border border-slate-200 bg-white font-mono text-xs"
          value={locText}
          onChange={(e) => setLocText(e.target.value)}
          disabled={!allowed}
        />
        <button
          type="button"
          disabled={!allowed || busy === "localization"}
          onClick={() =>
            void saveSection("localization", async () => {
              const obj = parseJsonObject(locText);
              await saveLocalizationSettings(obj);
            })
          }
          className="mt-3 rounded-xl bg-[#0f1e46] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy === "localization" ? "Inahifadhi…" : "Hifadhi lugha"}
        </button>
      </section>

      <section id="notifications" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <h3 className="text-lg font-bold text-[#0f1e46]">Arifa &amp; mawasiliano ya mfumo</h3>
        <p className="text-sm text-slate-600">Jedwali: notification_settings</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(
            [
              ["default_sms_sender", "SMS sender"],
              ["default_email_sender", "Email sender"],
              ["default_priority", "Kipaumbele"],
              ["reminder_timings", "Muda wa ukumbusho"],
              ["failure_alerts_toggle", "Tahadhari za makosa (on/off)"],
            ] as const satisfies ReadonlyArray<
              readonly [
                keyof Pick<
                  Omit<NotificationSettingsRow, "id" | "created_at">,
                  "default_sms_sender" | "default_email_sender" | "default_priority" | "reminder_timings" | "failure_alerts_toggle"
                >,
                string,
              ]
            >
          ).map(([k, lab]) => (
            <label key={k} className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">{lab}</span>
              <input
                className="rounded-xl border border-slate-200 px-3 py-2"
                value={notif[k]}
                onChange={(e) => setNotif((p) => ({ ...p, [k]: e.target.value }))}
                disabled={!allowed}
              />
            </label>
          ))}
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Idadi ya majaribio (retry)</span>
            <input
              type="number"
              className="rounded-xl border border-slate-200 px-3 py-2"
              value={notif.retry_count ?? ""}
              onChange={(e) => setNotif((p) => ({ ...p, retry_count: Number(e.target.value) || 0 }))}
              disabled={!allowed}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={!allowed || busy === "notifications"}
          onClick={() => void saveSection("notifications", async () => {
            await saveNotificationSettings(notif);
          })}
          className="mt-4 rounded-xl bg-blue-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy === "notifications" ? "Inahifadhi…" : "Hifadhi arifa"}
        </button>
      </section>

      <section id="finance" className="scroll-mt-24 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-lg">
        <h3 className="text-lg font-bold text-[#0f1e46]">Mipangilio ya fedha (portal)</h3>
        <p className="text-sm text-slate-600">Jedwali: finance_settings — si orodha kamili ya miamala, ni mapendeleo ya mfumo.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Sarafu msingi
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2"
              value={fin.default_currency}
              onChange={(e) => setFin((p) => ({ ...p, default_currency: e.target.value }))}
              disabled={!allowed}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Njia za malipo
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2"
              value={fin.default_payment_methods}
              onChange={(e) => setFin((p) => ({ ...p, default_payment_methods: e.target.value }))}
              disabled={!allowed}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Kizingiti cha idhinisho otomatiki
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2"
              value={fin.auto_approval_threshold}
              onChange={(e) => setFin((p) => ({ ...p, auto_approval_threshold: e.target.value }))}
              disabled={!allowed}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Kiambishi cha risiti
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2"
              value={fin.receipt_prefix}
              onChange={(e) => setFin((p) => ({ ...p, receipt_prefix: e.target.value }))}
              disabled={!allowed}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Mwaka wa fedha — kuanzia
            <input
              type="date"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2"
              value={fin.finance_year_start}
              onChange={(e) => setFin((p) => ({ ...p, finance_year_start: e.target.value }))}
              disabled={!allowed}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Mwaka wa fedha — mwisho
            <input
              type="date"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2"
              value={fin.finance_year_end}
              onChange={(e) => setFin((p) => ({ ...p, finance_year_end: e.target.value }))}
              disabled={!allowed}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={!allowed || busy === "finance"}
          onClick={() => void saveSection("finance", async () => {
            await saveFinanceSettings(fin);
          })}
          className="mt-4 rounded-xl bg-emerald-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy === "finance" ? "Inahifadhi…" : "Hifadhi fedha (portal)"}
        </button>
      </section>

      <IncomeDistributionSettingsPanel />

      <JsonSection
        id="attendance"
        title="Mahudhurio (JSON)"
        tableHint="attendance_settings"
        text={attText}
        setText={setAttText}
        busy={busy === "attendance"}
        disabled={!allowed}
        onSave={() =>
          saveSection("attendance", async () => {
            const obj = parseJsonObject(attText);
            await saveAttendanceSettings(obj);
          })
        }
      />

      <JsonSection
        id="media"
        title="Media (JSON)"
        tableHint="media_settings"
        text={mediaText}
        setText={setMediaText}
        busy={busy === "media"}
        disabled={!allowed}
        onSave={() =>
          saveSection("media", async () => {
            const obj = parseJsonObject(mediaText);
            await saveMediaSettings(obj);
          })
        }
      />

      <JsonSection
        id="reports"
        title="Ripoti (JSON)"
        tableHint="report_settings"
        text={repText}
        setText={setRepText}
        busy={busy === "reports"}
        disabled={!allowed}
        onSave={() =>
          saveSection("reports", async () => {
            const obj = parseJsonObject(repText);
            await saveReportSettings(obj);
          })
        }
      />

      <section id="backup" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <h3 className="text-lg font-bold text-[#0f1e46]">Backup</h3>
        <p className="text-sm text-slate-600">Jedwali: backup_settings</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Backup otomatiki
            <select
              className="rounded-xl border border-slate-200 px-3 py-2"
              value={backup.auto_backup_toggle}
              onChange={(e) => setBackup((p) => ({ ...p, auto_backup_toggle: e.target.value }))}
              disabled={!allowed}
            >
              <option value="on">Washa</option>
              <option value="off">Zima</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Mzunguko
            <input
              className="rounded-xl border border-slate-200 px-3 py-2"
              value={backup.backup_frequency}
              onChange={(e) => setBackup((p) => ({ ...p, backup_frequency: e.target.value }))}
              disabled={!allowed}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Uhifadhi (siku)
            <input
              className="rounded-xl border border-slate-200 px-3 py-2"
              value={backup.retention_period}
              onChange={(e) => setBackup((p) => ({ ...p, retention_period: e.target.value }))}
              disabled={!allowed}
            />
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            Mahali pa uhifadhi
            <input
              className="rounded-xl border border-slate-200 px-3 py-2"
              value={backup.storage_location}
              onChange={(e) => setBackup((p) => ({ ...p, storage_location: e.target.value }))}
              disabled={!allowed}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Thibitisha kabla ya restore
            <select
              className="rounded-xl border border-slate-200 px-3 py-2"
              value={backup.restore_confirmation_toggle}
              onChange={(e) => setBackup((p) => ({ ...p, restore_confirmation_toggle: e.target.value }))}
              disabled={!allowed}
            >
              <option value="on">Ndiyo</option>
              <option value="off">Hapana</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          disabled={!allowed || busy === "backup"}
          onClick={() => void saveSection("backup", async () => {
            await saveBackupSettings(backup);
          })}
          className="mt-4 rounded-xl bg-slate-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy === "backup" ? "Inahifadhi…" : "Hifadhi backup"}
        </button>
      </section>

      <JsonSection
        id="security"
        title="Usalama — mapendeleo ya ziada (JSON)"
        tableHint="security_preferences"
        text={secText}
        setText={setSecText}
        busy={busy === "security"}
        disabled={!allowed}
        onSave={() =>
          saveSection("security", async () => {
            const obj = parseJsonObject(secText);
            await saveSecurityPreferences(obj);
          })
        }
      />
    </div>
  );
}

function JsonSection({
  id,
  title,
  tableHint,
  text,
  setText,
  busy,
  disabled,
  onSave,
}: {
  id: string;
  title: string;
  tableHint: string;
  text: string;
  setText: (s: string) => void;
  busy: boolean;
  disabled: boolean;
  onSave: () => void;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-[#fffefb] p-6 shadow-lg">
      <h3 className="text-lg font-bold text-[#0f1e46]">{title}</h3>
      <p className="text-sm text-slate-600">Jedwali: {tableHint}</p>
      <textarea
        className="mt-3 min-h-[140px] w-full rounded-xl border border-slate-200 bg-white font-mono text-xs"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
      />
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => onSave()}
        className="mt-3 rounded-xl bg-indigo-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Inahifadhi…" : "Hifadhi"}
      </button>
    </section>
  );
}
