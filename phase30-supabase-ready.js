// PHASE 30 Supabase-ready unified placeholder
// No secrets here. Use env variables in .env.example

export const STORAGE_BUCKETS = {
  media: "kmt-media",
  documents: "kmt-documents",
  reports: "kmt-reports",
  profiles: "kmt-profiles",
  trainingMaterials: "kmt-training-materials",
};

export const REALTIME_CHANNELS = [
  "dashboard-kpi-live",
  "national-calendar-live",
  "ai-smart-live",
  "projects-live",
  "training-live",
];

export const RLS_POLICY_PLANNING = `
-- RLS planning notes:
-- 1) super_admin/admin => national scope access
-- 2) askofu_dayosisi => dayosisi-scoped rows
-- 3) mchungaji/kiongozi_idara => jimbo/tawi scoped rows
-- 4) member => self / assigned rows only
-- 5) write actions gated by role and module policy
`;

export function createSupabaseClientPlaceholder() {
  return {
    isPlaceholder: true,
    auth: { signIn: async () => ({ data: null, error: null }), signOut: async () => ({ error: null }) },
    from: () => ({
      select: async () => ({ data: [], error: null }),
      insert: async () => ({ data: null, error: null }),
      update: async () => ({ data: null, error: null }),
      delete: async () => ({ data: null, error: null }),
    }),
    channel: () => ({ on: () => {}, subscribe: () => {} }),
  };
}
