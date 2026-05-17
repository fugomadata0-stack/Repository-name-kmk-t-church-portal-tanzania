import type { FileManagerStorageBucket } from "../config/storageBuckets";

export type UserRole =
  | "super_admin"
  | "chief_admin"
  | "national_admin"
  | "office_admin"
  | "finance_admin"
  | "secretary"
  | "approver"
  | "reviewer"
  | "auditor"
  | "dayosisi_admin"
  | "jimbo_admin"
  | "tawi_admin"
  | "viewer"
  | "editor"
  | "member_user";

/** Vitu kwenye site_settings.gallery / categories (muundo rahisi wa JSON) */
export interface PortalCategoryItem {
  id: string;
  name: string;
}

export interface PortalCustomFieldItem {
  id: string;
  label: string;
  field_key: string;
}

/** Viunganishi vya mitandao / mawasiliano (site_settings.social_links, JSON) */
export interface SiteSocialLinks {
  whatsapp: string;
  facebook: string;
  youtube: string;
  instagram: string;
  twitter_x: string;
  email_public: string;
}

export interface SiteSettingsState {
  id?: string;
  hero_image_url: string;
  cross_image_url: string;
  gallery: unknown[];
  categories: PortalCategoryItem[];
  custom_fields: PortalCustomFieldItem[];
  meta_title: string;
  meta_description: string;
  og_image_url: string;
  canonical_base_url: string;
  maintenance_mode: boolean;
  maintenance_message: string;
  social_links: SiteSocialLinks;
  favicon_url: string;
  privacy_policy_url: string;
  terms_of_service_url: string;
  cookies_notice_url: string;
  support_url: string;
}

export interface AboutKmktState {
  id?: string;
  church_name: string;
  abbreviation: string;
  motto: string;
  mission: string;
  vision: string;
  core_values: string;
  history: string;
  objectives: string;
  headquarters: string;
  contacts: string;
  leadership_message: string;
  bible_verse: string;
  logo_url: string;
  hero_image_url: string;
  gallery: unknown[];
  status: "draft" | "active" | "inactive";
  published: boolean;
}

export type Status =
  | "Active"
  | "Pending"
  | "Inactive"
  | "Suspended"
  | "Archived"
  | "Needs Review"
  | "Draft"
  | "Submitted"
  | "Verified"
  | "Approved"
  | "Posted to Ledger"
  | "Locked"
  | "Reversed / Cancelled";

export interface DayosisiRecord {
  id: string;
  jina: string;
  code: string;
  askofu: string;
  makao: string;
  mkoa: string;
  simu: string;
  email: string;
  maelezo: string;
  status: Status;
  /** Uongozi wa dayosisi (safu za ziada kwenye DB) */
  makamu_mwenyekiti?: string;
  katibu?: string;
  naibu_katibu?: string;
  mhasibu?: string;
}

export interface JimboRecord {
  id: string;
  jina: string;
  dayosisi: string;
  /** Kutoka DB — kinachaguliwa moja kwa moja (kusahihisha kiunga). */
  dayosisi_id?: string | null;
  mkuu: string;
  mkoa: string;
  simu: string;
  status: Status;
}

export interface TawiRecord {
  id: string;
  jina: string;
  aina: string;
  dayosisi: string;
  jimbo: string;
  /** Kutoka DB */
  jimbo_id?: string | null;
  /** Msimbo wa tawi (kipekee ndani ya jimbo). */
  branch_code?: string | null;
  mkoa?: string | null;
  wilaya?: string | null;
  kata?: string | null;
  mtaa?: string | null;
  gps_lat?: number | null;
  gps_lng?: number | null;
  founded_date?: string | null;
  /** unverified | pending_review | verified */
  verification_status?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
  kiongozi: string;
  simu: string;
  status: Status;
}

export type ChurchStructureLevel =
  | "kmkt"
  | "dayosisi"
  | "jimbo"
  | "tawi"
  | "idara"
  | "huduma"
  | "taasisi"
  | "jumuiya";

export interface ChurchStructureEntity {
  id: string;
  name: string;
  code: string;
  official_name?: string;
  short_code?: string;
  logo_url?: string;
  photo_url?: string;
  signature_url?: string;
  /** Aina ya kitengo (mf. parokia, kituo) */
  entity_type?: string | null;
  level: ChurchStructureLevel;
  parent_id: string | null;
  parent_name: string | null;
  region: string;
  district: string;
  ward: string;
  village_street?: string;
  address: string;
  website?: string;
  gps_coordinates?: string;
  contact_person: string;
  phone: string;
  whatsapp?: string | null;
  email: string;
  established_date?: string | null;
  leader_name?: string | null;
  assistant_leaders?: string | null;
  secretary_name?: string | null;
  treasurer_name?: string | null;
  notes?: string | null;
  attachment_urls?: string[];
  custom_fields?: Record<string, unknown>;
  category_tags?: string[];
  hierarchy_summary?: string | null;
  profile_completeness?: number;
  children_count?: number;
  members_count?: number;
  families_count?: number;
  status: "active" | "inactive" | "pending" | "archived";
  description: string;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  /** Kiungo cha Google Maps / ramani rasmi */
  google_maps_url?: string | null;
}

/** Viongozi wengi kwa kila rekodi ya church_structure_entities (jedwali tofauti). */
export interface ChurchStructureLeader {
  id: string;
  entity_id: string;
  position_title: string;
  leadership_category: string;
  full_name: string;
  phone: string;
  email: string;
  photo_url: string;
  signature_url: string;
  appointment_document_url: string;
  term_start: string | null;
  term_end: string | null;
  status: "active" | "ended" | "suspended" | "archived";
  notes: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface KiongoziRecord {
  id: string;
  jina: string;
  full_name?: string;
  photo_url?: string | null;
  signature_url?: string | null;
  gender?: string | null;
  cheo: string;
  position_id?: string | null;
  ngazi: string;
  leadership_level?: string | null;
  assigned_entity?: string | null;
  dayosisi: string;
  jimbo: string;
  tawi: string;
  simu: string;
  email?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  idara_name?: string | null;
  huduma_name?: string | null;
  taasisi_name?: string | null;
  jumuiya_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  appointment_date?: string | null;
  term_status?: "active" | "ended" | "suspended" | "pending";
  appointment_document_url?: string | null;
  appointment_document_name?: string | null;
  appointment_document_path?: string | null;
  appointment_document_size?: number | null;
  appointment_document_type?: string | null;
  appointment_uploaded_at?: string | null;
  notes?: string | null;
  /** Wasifu fupi kwenye `church_viongozi` (sio lazima kuwa na rekodi ya `leadership_profiles`). */
  biography?: string | null;
  date_of_birth?: string | null;
  national_id?: string | null;
  passport_number?: string | null;
  church_member_id?: string | null;
  mkoa?: string | null;
  wilaya?: string | null;
  kata?: string | null;
  leadership_category_id?: string | null;
  committee_group_id?: string | null;
  reporting_leader_id?: string | null;
  structure_entity_id?: string | null;
  former_leader?: boolean;
  reason_for_leaving?: string | null;
  education_summary?: string | null;
  theology_training?: string | null;
  professional_skills?: string | null;
  certificates_summary?: string | null;
  ministry_gifts?: string | null;
  ministry_experience?: string | null;
  internal_notes?: string | null;
  audit_notes?: string | null;
  pdf_issued_by_name?: string | null;
  pdf_issued_by_title?: string | null;
  status: Status;
  /** Viongozi wanne wa taifa — jina/cheo/simu hazibadiliki kwenye wasifu wa CV. */
  official_locked?: boolean;
  official_lock_key?: string | null;
  /** Kutoka DB — kusajili kiunga sahihi */
  dayosisi_id?: string | null;
  jimbo_id?: string | null;
  tawi_id?: string | null;
}

export interface LeadershipPositionRecord {
  id: string;
  title: string;
  level_key: string | null;
  active: boolean;
  sort_order?: number;
  code?: string | null;
  description?: string | null;
  category_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LeadershipCategoryRecord {
  id: string;
  name: string;
  description?: string | null;
  level_key?: string | null;
  sort_order: number;
  active: boolean;
}

export interface LeadershipCommitteeRecord {
  id: string;
  name: string;
  description?: string | null;
  level_key?: string | null;
  dayosisi_id?: string | null;
  jimbo_id?: string | null;
  tawi_id?: string | null;
  structure_entity_id?: string | null;
  sort_order: number;
  active: boolean;
}

export interface LeadershipTermRecord {
  id: string;
  leader_id: string;
  position_id: string | null;
  start_date: string;
  end_date: string | null;
  term_status: "active" | "ended" | "suspended" | "pending";
}

export interface LeadershipDocumentRecord {
  id: string;
  leader_id: string;
  file_url: string;
  file_name: string;
  file_path?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  status?: string;
  uploaded_at: string;
}

/** Wasifu rasmi — rekodi kuu (1:1 na church_viongozi) + viwango vya CV. */
export interface LeadershipProfileCvRecord {
  id: string;
  leader_id: string;
  nationality: string | null;
  biography: string | null;
  reporting_office: string | null;
  profile_photo_storage_path: string | null;
  signature_storage_path: string | null;
  original_cv_storage_path: string | null;
  original_cv_file_name: string | null;
  original_cv_mime: string | null;
  original_cv_bytes: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface LeadershipCvExperienceRow {
  id: string;
  leader_id: string;
  start_year: number;
  end_year: number | null;
  institution: string;
  position: string;
  description: string | null;
  sort_order: number;
}

export type LeadershipCvEducationKind =
  | "certificate"
  | "diploma"
  | "degree"
  | "masters"
  | "theology"
  | "seminar"
  | "workshop"
  | "other";

export interface LeadershipCvEducationRow {
  id: string;
  leader_id: string;
  education_kind: LeadershipCvEducationKind | string;
  institution: string;
  qualification: string;
  year: number | null;
  specialization: string | null;
  sort_order: number;
}

export interface LeadershipCvCertificateRow {
  id: string;
  leader_id: string;
  certificate_name: string;
  issuer: string | null;
  year: number | null;
  notes: string | null;
  document_storage_path: string | null;
  sort_order: number;
}

export type LeadershipCvSkillCategory = "leadership" | "ministry" | "technical" | "language" | "spiritual_gift" | string;

export interface LeadershipCvSkillRow {
  id: string;
  leader_id: string;
  skill_category: LeadershipCvSkillCategory;
  label: string;
  sort_order: number;
}

export type LeadershipCvAttachmentKind =
  | "cv_pdf"
  | "certificate"
  | "appointment"
  | "ministry"
  | "national_id"
  | "passport"
  | "other"
  | string;

export interface LeadershipCvAttachmentRow {
  id: string;
  leader_id: string;
  attachment_kind: LeadershipCvAttachmentKind;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  sort_order: number;
  created_at?: string;
}

export interface LeadershipCvBundle {
  profile: LeadershipProfileCvRecord | null;
  experience: LeadershipCvExperienceRow[];
  education: LeadershipCvEducationRow[];
  certificates: LeadershipCvCertificateRow[];
  skills: LeadershipCvSkillRow[];
  attachments: LeadershipCvAttachmentRow[];
}

export interface AttendanceSessionRecord {
  id: string;
  attendance_date: string;
  service_name: string;
  attendance_type: string;
  dayosisi_id?: string | null;
  jimbo_id?: string | null;
  tawi_id?: string | null;
  idara_name?: string | null;
  huduma_name?: string | null;
  jumuiya_name?: string | null;
  total_men: number;
  total_women: number;
  total_youth: number;
  total_children: number;
  visitors: number;
  total_attendance: number;
  recorded_by?: string | null;
  notes?: string | null;
  status: Status;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceMemberRecord {
  id: string;
  session_id: string;
  member_id: string;
  member_name: string;
  attendance_status: "present" | "absent";
  qr_code?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface FedhaRecord {
  id: string;
  tarehe: string;
  aina: string;
  kategoria: string;
  kiasi: number;
  ngazi: string;
  dayosisi: string;
  jimbo: string;
  tawi: string;
  status: Status;
  /** Viunganishi halisi vya muundo */
  dayosisi_id?: string | null;
  jimbo_id?: string | null;
  tawi_id?: string | null;
}

export type IncomeDistributionMode = "hierarchy_share" | "full_remittance";

export interface IncomeSourceRecord {
  id: string;
  chanzo: string;
  source_type?: "predefined" | "custom";
  source_code?: string;
  category: string;
  subtitle: string;
  frequency?: "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Annual" | "One-time";
  restrictedFund?: "Yes" | "No";
  approvalRequired?: "Yes" | "No";
  /** hierarchy_share = sehemu (kwa kawaida 35%) inapanda juu; full_remittance = 100% kamili */
  distributionMode?: IncomeDistributionMode;
  upwardSharePercent?: number;
  aina: "Mapato Halisi" | "Taarifa ya Msingi";
  maelezo: string;
  status: Status;
}

export interface IncomeManagementRecord {
  id: string;
  sourceId?: string;
  incomeCode: string;
  sourceName: string;
  mainCategory: string;
  subCategory: string;
  churchLevel: string;
  incomeType: "Cash" | "Bank" | "Mobile Money" | "In-kind" | "Transfer";
  frequency: "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Annual" | "One-time";
  budgeted: "Yes" | "No";
  restrictedFund: "Yes" | "No";
  approvalRequired?: "Yes" | "No";
  fundPurpose: string;
  collectionDate: string;
  serviceEventDate: string;
  collectorReceiver: string;
  approvedBy: string;
  receiptNo: string;
  transactionReference: string;
  amount: number;
  currency: string;
  status: Status;
  branchCenter: string;
  remarks: string;
  /** UUID za muundo (wakati zipo kwenye church_income_lines) — kwa mipaka ya eneo */
  dayosisi_id?: string | null;
  jimbo_id?: string | null;
  tawi_id?: string | null;
  distributionMode?: IncomeDistributionMode;
  upwardSharePercent?: number;
  amountLocal?: number;
  amountUpward?: number;
}

export type MembershipStatusDb = "active" | "visitor" | "transferred" | "deceased" | "suspended";

export type MinistrySegmentDb = "none" | "ke" | "me" | "jvkmkt" | "jwkmkt";

/** Jedwali: church_families (Supabase) */
export interface ChurchFamilyRecord {
  id: string;
  family_name: string;
  head_member_id?: string | null;
  head_member_name?: string | null;
  dayosisi_id: string | null;
  /** FK za kihesabu (migration); zikiwa tupu tunatumia tu majina ya maandishi */
  jimbo_id?: string | null;
  tawi_id?: string | null;
  jimbo_name: string | null;
  tawi_name: string | null;
  phone: string | null;
  email: string | null;
  maelezo: string | null;
  /** Kwa PremiumTable / chapishi */
  status: Status;
}

/** Jedwali: church_members (Supabase) */
export interface ChurchMemberRecord {
  id: string;
  family_id: string | null;
  family_name: string;
  relation_to_head?: string | null;
  first_name: string;
  last_name: string;
  jina_kamili: string;
  gender: string;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  nida_number?: string | null;
  photo_url?: string | null;
  marital_status?: string | null;
  occupation?: string | null;
  region_name?: string | null;
  district_name?: string | null;
  ward_street?: string | null;
  jimbo_name?: string | null;
  jumuiya_name?: string | null;
  idara_name?: string | null;
  huduma_name?: string | null;
  membership_status: MembershipStatusDb;
  baptism_date: string | null;
  baptism_place: string | null;
  is_baptized: boolean;
  member_number: string | null;
  dayosisi_id: string | null;
  jimbo_id?: string | null;
  tawi_id?: string | null;
  tawi_name: string | null;
  ministry_segment?: MinistrySegmentDb | null;
  notes: string | null;
  status: Status;
}

export interface MemberCardRecord {
  id: string;
  member_id: string;
  card_number: string;
  qr_url: string;
  issued_at: string;
}

/** Jedwali: developer_profile — wasifu mmoja wa kiufundi */
export interface DeveloperProfileRecord {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  po_box: string;
  photo_url: string | null;
  bio: string;
  created_at: string;
  updated_at?: string;
  created_by?: string | null;
  updated_by?: string | null;
  status?: string;
}

/** Jedwali: documents (Nyaraka — faili halisi) */
export interface ChurchDocumentRecord {
  id: string;
  title: string;
  category: string;
  type?: string;
  department?: string;
  uploaded_by?: string;
  branch?: string;
  file_url: string;
  file_name?: string | null;
  file_path?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  uploaded_at?: string | null;
  description: string;
  created_at: string;
  updated_at?: string;
  created_by?: string | null;
  updated_by?: string | null;
  visibility_level?: string;
  status: Status;
}

export type SermonMediaType = "audio" | "video";

/** Jedwali: events (Stage 2 — Matukio) */
export interface ChurchEventRecord {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time?: string | null;
  location: string;
  organizer?: string;
  speaker?: string;
  status?: "upcoming" | "ongoing" | "completed" | "cancelled";
  is_public?: boolean;
  poster_url: string | null;
  created_at: string;
}

/** Jedwali: gallery */
export interface GalleryImageRecord {
  id: string;
  title: string;
  image_url: string;
  category: string;
  created_at: string;
  updated_at?: string;
  file_name?: string | null;
  file_path?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  uploaded_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  status?: string;
}

/** Jedwali: news_posts */
export interface NewsPostRecord {
  id: string;
  title: string;
  slug?: string;
  content: string;
  summary?: string;
  category: string;
  author?: string;
  status?: "draft" | "published" | "archived";
  publish_date?: string | null;
  is_public?: boolean;
  featured?: boolean;
  image_url: string | null;
  created_at: string;
}

/** Jedwali: videos */
export interface ChurchVideoRecord {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  created_at: string;
  updated_at?: string;
  file_name?: string | null;
  file_path?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  uploaded_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  status?: string;
}

/** Jedwali: audios */
export interface ChurchAudioRecord {
  id: string;
  title: string;
  audio_url: string;
  created_at: string;
  updated_at?: string;
  file_name?: string | null;
  file_path?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  uploaded_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  status?: string;
}

/** Jedwali: sermons (Mahubiri) */
export interface SermonRecord {
  id: string;
  title: string;
  preacher: string;
  date: string;
  scripture: string;
  media_type: SermonMediaType;
  media_url: string;
  description: string;
  created_at: string;
  status: Status;
}

/** Jedwali: portal_domain_entities — rekodi za moduli mbalimbali */
export interface DomainEntityRecord {
  id: string;
  module_key: string;
  submodule_key: string;
  title: string;
  details: string;
  category: string;
  reference_code: string;
  event_date: string;
  extra: Record<string, unknown>;
  profile_completeness?: number;
  hierarchy_summary?: string | null;
  attachment_urls?: string[];
  category_tags?: string[];
  status: Status;
}

export interface ModuleItem {
  key: string;
  label: string;
  color: string;
  submodules: string[];
}

/** ——— Usalama (Supabase) ——— */
export interface PortalRoleRow {
  role_key: string;
  label_sw: string;
  label_en: string | null;
  hierarchy_rank: number;
  description: string | null;
  is_system: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PortalModuleMatrixRow {
  role_key: string;
  module_key: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_reject: boolean;
  can_export: boolean;
  can_print: boolean;
  can_upload: boolean;
  can_download: boolean;
  can_manage_settings: boolean;
  can_audit: boolean;
  updated_at?: string;
}

export type PortalDirectoryStatus = "pending" | "invited" | "active" | "suspended";

export interface PortalDirectoryProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role_key: string;
  auth_user_id: string | null;
  dayosisi_scope: string | null;
  jimbo_scope: string | null;
  tawi_scope: string | null;
  status: PortalDirectoryStatus;
  notes: string | null;
  meta: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export type PortalVisibilityScope = "national" | "dayosisi" | "jimbo" | "tawi" | "self";

export interface PortalVisibilityRule {
  id: string;
  name: string;
  module_key: string;
  scope_type: PortalVisibilityScope;
  dayosisi_match: string | null;
  jimbo_match: string | null;
  tawi_match: string | null;
  allowed_roles: string[];
  priority: number;
  active: boolean;
  notes: string | null;
  meta: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export type PortalAccessEventType = "login" | "logout" | "token_refresh" | "page_view" | "api" | "policy_change" | "rbac_change";

export interface PortalAccessEventRow {
  id: string;
  user_label: string | null;
  auth_user_id: string | null;
  event_type: PortalAccessEventType;
  detail: Record<string, unknown> | null;
  created_at?: string;
}

export interface PortalSecurityPoliciesRow {
  id: number;
  policy_json: Record<string, unknown>;
  updated_at?: string;
}

export type HealthBadgeStatus = "healthy" | "warning" | "critical";

export interface SystemHealthAlertDetail {
  id: string;
  title: string;
  type: string;
  module: string;
  priority: "info" | "success" | "warning" | "critical";
  status: "open" | "resolved";
  created_at: string;
  message: string;
}

export interface SystemHealthAuditFailureDetail {
  id: string;
  time: string;
  module: string;
  action: string;
  status: string;
  message: string;
}

export interface SystemHealthSnapshot {
  badges: {
    database: HealthBadgeStatus;
    notifications: HealthBadgeStatus;
    uploads: HealthBadgeStatus;
    jobs: HealthBadgeStatus;
    realtime: HealthBadgeStatus;
    backups: HealthBadgeStatus;
    storage: HealthBadgeStatus;
  };
  indicators: {
    database_connection: "online" | "offline";
    supabase_health: "healthy" | "degraded" | "down";
    realtime_sync: "online" | "degraded" | "offline";
    backup_status: "healthy" | "stale" | "unknown";
    notification_health: "healthy" | "degraded" | "down";
    storage_usage_mb: number | null;
    upload_failures_24h: number | null;
    failed_jobs_24h: number | null;
    open_warning_alerts: number;
    open_critical_alerts: number;
    failed_logins_24h: number;
  };
  logs_summary: {
    audit_events_24h: number;
    audit_failures_24h: number;
    latest_backup_at: string | null;
    latest_alert_at: string | null;
  };
  storage: {
    read_allowed: boolean;
    read_note: string | null;
    bucket_file_counts: Record<string, number>;
    total_files: number;
  };
  notifications: {
    total: number;
    unread: number;
    failed: number;
    last_notification_at: string | null;
    realtime_channel_status: "online" | "degraded" | "offline";
    empty: boolean;
  };
  backups: {
    auto_backup_enabled: boolean;
    provider_status: string;
    restore_verification_status: string;
    backup_frequency: string | null;
    retention_period: string | null;
    configured: boolean;
  };
  alert_details: SystemHealthAlertDetail[];
  audit_failure_details: SystemHealthAuditFailureDetail[];
  warnings: string[];
  cleanup_recommendations: string[];
  checked_at: string;
}

/** Buckets za Stage 3 — File Manager (chanzo: config/storageBuckets) */
export type ChurchFileStorageBucket = FileManagerStorageBucket;

/** Jedwali: file_manager_items */
export interface FileManagerItemRecord {
  id: string;
  title: string;
  file_url: string;
  bucket_name: FileManagerStorageBucket;
  file_path: string;
  file_type: string;
  category: string;
  description: string;
  created_at: string;
  updated_at?: string;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  uploaded_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  status?: string;
}

/** Jedwali: live_streams */
export interface LiveStreamRecord {
  id: string;
  title: string;
  platform: string;
  stream_url: string;
  embed_url: string;
  status?: "scheduled" | "live" | "ended";
  is_live: boolean;
  scheduled_at: string | null;
  ended_at?: string | null;
  description: string;
  thumbnail_url?: string | null;
  preacher?: string;
  event_link?: string;
  category?: string;
  is_public?: boolean;
  created_at: string;
}

/** Majibu ya RPC portal_analytics_dashboard */
export interface AnalyticsDashboardPayload {
  range: { from: string; to: string };
  category_filter: string | null;
  filters?: {
    year?: string | null;
    month?: string | null;
    dayosisi_id?: string | null;
    jimbo_id?: string | null;
    tawi_id?: string | null;
    source?: string | null;
    leadership_level?: string | null;
    department?: string | null;
  };
  totals: {
    members: number;
    families: number;
    finance_entries: number;
    income_sources: number;
    income_lines: number;
    documents: number;
    sermons: number;
    events: number;
    videos: number;
    audios: number;
    media_total: number;
    dayosisi: number;
    majimbo: number;
    matawi: number;
    jumuiya: number;
    idara: number;
    taasisi: number;
    leaders_total: number;
    leaders_active: number;
    leaders_pending: number;
    leaders_expiring_terms: number;
    members_active: number;
    members_pending: number;
    notifications: number;
    audit_logs: number;
    failed_logins: number;
  };
  period: {
    members_new: number;
    families_new: number;
    finance_entries: number;
    finance_income_sum: number;
    income_lines_sum: number;
    documents: number;
    sermons: number;
    events: number;
    videos: number;
    audios: number;
  };
  finance_by_month: { month: string; mapato: number }[];
  income_by_category: { label: string; amount: number }[];
  income_by_source: { label: string; amount: number }[];
  budget_vs_actual: { label: string; budget: number; actual: number }[];
  top_branches: { label: string; amount: number }[];
  members_growth: { month: string; total: number }[];
  members_by_region: { label: string; total: number }[];
  members_by_gender: { label: string; total: number }[];
  members_by_age_group: { label: string; total: number }[];
  leaders_by_level: { label: string; total: number }[];
  term_expiry_trend: { month: string; total: number }[];
  leadership_distribution: { label: string; total: number }[];
  media_uploads_by_month: { month: string; total: number }[];
  documents_by_category: { label: string; total: number }[];
  livestream_trend: { month: string; total: number }[];
  login_activity: { day: string; total: number }[];
  audit_activity: { day: string; total: number }[];
  notification_trend: { day: string; total: number }[];
  leaders_by_level_total: { label: string; total: number }[];
  realtime_status: "online" | "offline";
  storage_usage_mb: number;
  recent_activity: { kind: string; label: string; at: string }[];
}

export type PortalNotificationType =
  | "auth"
  | "approval"
  | "finance"
  | "document"
  | "system"
  | "structure"
  | "media"
  | "event"
  | "info"
  | "success"
  | "warning"
  | "error";
export type PortalNotificationPriority = "info" | "success" | "warning" | "critical";

/** Jedwali: notifications + hali ya kusoma (read_by_me kutoka notification_reads) */
export interface PortalNotificationRow {
  id: string;
  module: string;
  title: string;
  message: string;
  type: PortalNotificationType;
  priority: PortalNotificationPriority;
  target_role: string | null;
  target_user_id: string | null;
  read_status: boolean;
  action_url: string | null;
  created_by: string | null;
  is_global: boolean;
  /** Safu ya zamani ya DB — tumia read_by_me kwa kiini */
  is_read_legacy: boolean;
  read_by_me: boolean;
  created_at: string;
  updated_at: string;
}

export type PortalAlertKind = "finance" | "system" | "content" | "church";
export type PortalAlertStatus = "open" | "resolved";
export interface SystemAlertRow {
  id: string;
  type: string;
  module: string;
  title: string;
  message: string;
  priority: PortalNotificationPriority;
  target_role: string | null;
  target_user_id: string | null;
  action_url: string | null;
  status: PortalAlertStatus;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/** Misaada ya Kanisa — wanufaika */
export interface AidBeneficiaryRow {
  id: string;
  full_name: string;
  gender: "" | "male" | "female" | "other";
  phone: string;
  address: string;
  group_category: AidGroupCategory;
  special_condition: string;
  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type AidGroupCategory =
  | "Wazee"
  | "Wajane"
  | "Yatima"
  | "Walemavu"
  | "Watoto"
  | "Vijana"
  | "Wagonjwa"
  | "Familia zenye uhitaji"
  | "Wengine";

export type AidTypeKey = "cash" | "food" | "medical" | "education" | "clothes" | "shelter" | "other";
export type AidUrgencyLevel = "low" | "medium" | "high" | "emergency";
export type AidWorkflowStatus = "draft" | "submitted" | "review" | "approved" | "rejected" | "completed";
export type AidApprovalStatus = "pending" | "approved" | "rejected";
export type AidDeliveryMethod = "cash" | "mobile_money" | "bank" | "physical_items";

/** Ombi la msaada */
export interface AidRequestRow {
  id: string;
  beneficiary_id: string;
  aid_type: AidTypeKey;
  description: string;
  amount: number;
  items: unknown;
  urgency_level: AidUrgencyLevel;
  request_date: string;
  request_month?: string;
  status: AidWorkflowStatus;
  reviewed_by: string;
  review_notes: string;
  review_date: string | null;
  approved_by: string;
  approved_signature: string;
  approval_notes: string;
  approved_at: string | null;
  approval_status: AidApprovalStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/** Utoaji / malipo */
export interface AidDisbursementRow {
  id: string;
  request_id: string;
  delivered_by: string;
  delivered_at: string | null;
  delivery_method: AidDeliveryMethod;
  delivery_reference: string;
  delivery_notes: string;
  recipient_confirmation: string;
  amount_delivered: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Join kwa UI */
export interface AidRequestJoinedRow extends AidRequestRow {
  aid_beneficiaries?: AidBeneficiaryRow | AidBeneficiaryRow[] | null;
  aid_disbursements?: AidDisbursementRow | AidDisbursementRow[] | null;
}

/** ——— Mawasiliano / Communications (Supabase) ——— */

export type CommunicationChannel = "sms" | "email" | "both";
export type CommunicationTargetType =
  | "all"
  | "role"
  | "group"
  | "individual"
  | "beneficiaries"
  | "event_participants"
  | "members"
  | "custom_list";
export type CommunicationStatus = "draft" | "queued" | "sent" | "failed" | "cancelled";
export type CommunicationRecipientDeliveryStatus = "pending" | "sent" | "failed" | "skipped";

export interface CommunicationRecord {
  id: string;
  title: string;
  message: string;
  subject: string | null;
  custom_recipients_raw: string | null;
  channel: CommunicationChannel;
  target_type: CommunicationTargetType;
  target_role: string | null;
  target_user_id: string | null;
  target_group: string | null;
  target_email: string | null;
  target_phone: string | null;
  recipients_count: number;
  status: CommunicationStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunicationRecipientRecord {
  id: string;
  communication_id: string;
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  recipient_type: string | null;
  delivery_status: CommunicationRecipientDeliveryStatus;
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface CommunicationTemplateRecord {
  id: string;
  name: string;
  channel: CommunicationChannel;
  subject: string | null;
  body: string;
  category: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
