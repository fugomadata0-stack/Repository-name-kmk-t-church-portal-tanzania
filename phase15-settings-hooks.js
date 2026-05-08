export const settingsRoleAccess = {
  chief_admin: { edit: true, reset: true, restore: true },
  super_admin: { edit: true, reset: true, restore: true },
  admin: { edit: true, reset: true, restore: true },
  askofu_dayosisi: { edit: true, reset: false, restore: false },
  member: { edit: false, reset: false, restore: false },
};

export const settingsTabs = [
  "General","Branding","Church Identity","Localization","Roles & Permissions Defaults","Notifications","Finance","Attendance","Media","Reports","Backup","Security","Environment",
];

export const sectionFields = {
  General: [
    { key: "system_name", label: "System Name" }, { key: "short_name", label: "Short Name" }, { key: "motto", label: "Motto" }, { key: "official_description", label: "Official Description", textarea: true },
    { key: "timezone", label: "Timezone" }, { key: "default_date_format", label: "Default Date Format" }, { key: "default_currency", label: "Default Currency" }, { key: "status", label: "Status" },
  ],
  Branding: [
    { key: "logo", label: "Logo placeholder" }, { key: "favicon", label: "Favicon placeholder" }, { key: "primary_color", label: "Primary Color" }, { key: "secondary_color", label: "Secondary Color" },
    { key: "accent_color", label: "Accent Color" }, { key: "hero_bg", label: "Hero Background Image placeholder" }, { key: "jesus_image", label: "Jesus Image placeholder" },
    { key: "cross_image", label: "Cross / Msalaba (URL au Storage)" }, { key: "bible_image", label: "Bible Image placeholder" },
    { key: "church_image", label: "Church Image placeholder" }, { key: "theme_mode", label: "Theme Mode" }, { key: "footer_text", label: "Custom Footer Text", textarea: true },
  ],
  "Church Identity": [
    { key: "official_church_name", label: "Official Church Name" }, { key: "country", label: "Country" }, { key: "headquarters", label: "Headquarters" }, { key: "main_phone", label: "Main Phone" },
    { key: "main_email", label: "Main Email" }, { key: "postal_address", label: "Postal Address" }, { key: "website_url", label: "Website URL" }, { key: "vision", label: "Vision", textarea: true },
    { key: "mission", label: "Mission", textarea: true }, { key: "core_values", label: "Core Values", textarea: true },
  ],
  Notifications: [
    { key: "default_sms_sender", label: "Default SMS Sender Name" }, { key: "default_email_sender", label: "Email Sender Name" }, { key: "default_priority", label: "Default Notification Priority" },
    { key: "reminder_timings", label: "Reminder Timings" }, { key: "retry_count", label: "Retry Count", type: "number" }, { key: "failure_alerts_toggle", label: "Failure Alerts Toggle" },
  ],
  Finance: [
    { key: "default_currency", label: "Default Currency" }, { key: "default_payment_methods", label: "Default Payment Methods" }, { key: "auto_approval_threshold", label: "Auto Approval Threshold placeholder" },
    { key: "receipt_prefix", label: "Receipt Number Prefix" }, { key: "finance_year_start", label: "Finance Year Start", type: "date" }, { key: "finance_year_end", label: "Finance Year End", type: "date" },
  ],
  Backup: [
    { key: "auto_backup_toggle", label: "Auto Backup Toggle" }, { key: "backup_frequency", label: "Backup Frequency" }, { key: "retention_period", label: "Retention Period" },
    { key: "storage_location", label: "Storage Location Placeholder" }, { key: "restore_confirmation_toggle", label: "Restore Confirmation Toggle" },
  ],
};
