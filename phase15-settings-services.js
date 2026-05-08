import { getSafeSupabase, safeAsync } from "./phase-integration-core.js";

const defaults = {
  General: { system_name: "KMK(T) NATIONAL CHURCH PORTAL", short_name: "KMK(T) Portal", motto: "Serving the Church Through Digital Excellence", official_description: "Mfumo wa kidigitali wa kanisa", timezone: "Africa/Dar_es_Salaam", default_date_format: "DD/MM/YYYY", default_currency: "TZS", status: "active" },
  Branding: { logo: "placeholder", favicon: "placeholder", primary_color: "#1a4ec3", secondary_color: "#12254e", accent_color: "#d8b14a", hero_bg: "placeholder", jesus_image: "placeholder", cross_image: "", bible_image: "placeholder", church_image: "placeholder", theme_mode: "dark", footer_text: "KMT Church Tanzania Portal" },
  "Church Identity": { official_church_name: "KMT Church Tanzania", country: "Tanzania", headquarters: "Dar es Salaam", main_phone: "0624683622", main_email: "info@kmt.or.tz", postal_address: "P.O Box 000", website_url: "https://kmt.or.tz", vision: "Kufikia watu wote kwa Injili", mission: "Kujenga waumini imara", core_values: "Uaminifu, Upendo, Huduma" },
  Localization: {}, "Roles & Permissions Defaults": {}, Notifications: { default_sms_sender: "KMKT-CHURCH", default_email_sender: "KMK(T) Portal", default_priority: "Medium", reminder_timings: "24h,2h", retry_count: 3, failure_alerts_toggle: "on" },
  Finance: { default_currency: "TZS", default_payment_methods: "Cash,Mobile Money,Card", auto_approval_threshold: "500000", receipt_prefix: "KMT-RCPT", finance_year_start: "2026-01-01", finance_year_end: "2026-12-31" },
  Attendance: {}, Media: {}, Reports: {}, Backup: { auto_backup_toggle: "on", backup_frequency: "daily", retention_period: "90 days", storage_location: "placeholder", restore_confirmation_toggle: "on" }, Security: {}, Environment: {},
};

const state = { mode: "mock", sections: JSON.parse(JSON.stringify(defaults)) };
const useSupabase = () => !!getSafeSupabase();
export const getMode = () => state.mode;
export const getSections = () => JSON.parse(JSON.stringify(state.sections));
export const getDefaultSections = () => JSON.parse(JSON.stringify(defaults));

export async function loadSettingsData() {
  if (!useSupabase()) { state.mode = "mock"; return; }
  state.mode = "supabase";
  const s = getSafeSupabase();
  if (!s) { state.mode = "mock"; return; }
  const result = await safeAsync(
    "phase15_load_settings_data",
    async () =>
      Promise.all([
        s.from("system_settings").select("*").limit(1),
        s.from("branding_settings").select("*").limit(1),
        s.from("church_identity").select("*").limit(1),
        s.from("localization_settings").select("*").limit(1),
        s.from("notification_settings").select("*").limit(1),
        s.from("finance_settings").select("*").limit(1),
        s.from("attendance_settings").select("*").limit(1),
        s.from("media_settings").select("*").limit(1),
        s.from("report_settings").select("*").limit(1),
        s.from("backup_settings").select("*").limit(1),
        s.from("security_preferences").select("*").limit(1),
      ]),
    null
  );
  if (!result) { state.mode = "mock"; return; }
  const [system, branding, church, localization, notify, finance, attendance, media, report, backup, security] = result;
  if (!system.error && system.data?.[0]) state.sections.General = system.data[0];
  if (!branding.error && branding.data?.[0]) state.sections.Branding = branding.data[0];
  if (!church.error && church.data?.[0]) state.sections["Church Identity"] = church.data[0];
  if (!localization.error && localization.data?.[0]) state.sections.Localization = localization.data[0];
  if (!notify.error && notify.data?.[0]) state.sections.Notifications = notify.data[0];
  if (!finance.error && finance.data?.[0]) state.sections.Finance = finance.data[0];
  if (!attendance.error && attendance.data?.[0]) state.sections.Attendance = attendance.data[0];
  if (!media.error && media.data?.[0]) state.sections.Media = media.data[0];
  if (!report.error && report.data?.[0]) state.sections.Reports = report.data[0];
  if (!backup.error && backup.data?.[0]) state.sections.Backup = backup.data[0];
  if (!security.error && security.data?.[0]) state.sections.Security = security.data[0];
}

const tableMap = {
  General: "system_settings", Branding: "branding_settings", "Church Identity": "church_identity", Localization: "localization_settings", Notifications: "notification_settings",
  Finance: "finance_settings", Attendance: "attendance_settings", Media: "media_settings", Reports: "report_settings", Backup: "backup_settings", Security: "security_preferences",
};

export async function saveSection(section, payload) {
  state.sections[section] = { ...state.sections[section], ...payload };
  if (!useSupabase()) return;
  const table = tableMap[section]; if (!table) return;
  const s = getSafeSupabase();
  if (!s) return;
  await safeAsync("phase15_save_section", async () => {
    const { data } = await s.from(table).select("id").limit(1);
    if (data?.length) await s.from(table).update(payload).eq("id", data[0].id);
    else await s.from(table).insert(payload);
  });
}

export function resetSection(section) {
  state.sections[section] = JSON.parse(JSON.stringify(defaults[section] || {}));
}

export function restoreDefaultsAll() {
  state.sections = JSON.parse(JSON.stringify(defaults));
}
