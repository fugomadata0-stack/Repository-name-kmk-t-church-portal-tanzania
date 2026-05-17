/**
 * Public website data — anon-safe queries and RPCs only.
 * Never returns budgets, internal approvals, or contact PII beyond public profiles.
 */
import { getSupabase } from "../lib/supabaseClient";
import { fetchPortalPublicDashboardCountsCached } from "../lib/portalPublicDashboardCache";

export type PublicNewsRow = {
  id: string;
  title: string;
  created_at: string;
  summary?: string;
  featured?: boolean;
};

export type PublicEventRow = {
  id: string;
  title: string;
  event_date: string;
  location: string;
  description?: string;
};

export type PublicDocRow = {
  id: string;
  title: string;
  category: string;
  created_at: string;
};

export type PublicLiveRow = { id: string; title: string; stream_url: string };
export type PublicSermonRow = { id: string; title: string; preacher: string; date: string };
export type PublicGalleryRow = { id: string; title: string; image_url: string; category: string };
export type PublicProjectRow = {
  id: string;
  name: string;
  project_type: string;
  location_region: string;
  location_district: string;
};
export type PublicVideoRow = { id: string; title: string; video_url: string; thumbnail_url?: string };
export type PublicAudioRow = { id: string; title: string; audio_url: string };

export type PublicNationalLeaderRow = {
  role_key: string;
  full_name: string;
  profile_photo_url: string;
  leadership_quote: string;
  display_title_sw: string;
};

export type PublicLandingContent = {
  news: PublicNewsRow[];
  events: PublicEventRow[];
  documents: PublicDocRow[];
  liveNow: PublicLiveRow[];
  sermons: PublicSermonRow[];
  gallery: PublicGalleryRow[];
  projects: PublicProjectRow[];
  videos: PublicVideoRow[];
  audios: PublicAudioRow[];
  leaders: PublicNationalLeaderRow[];
  counts: Awaited<ReturnType<typeof fetchPortalPublicDashboardCountsCached>>;
};

function mapGalleryFromRpc(raw: unknown): PublicGalleryRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => {
      const row = r as Record<string, unknown>;
      const image_url = String(row.image_url ?? "").trim();
      if (!image_url) return null;
      return {
        id: String(row.id ?? ""),
        title: String(row.title ?? ""),
        image_url,
        category: String(row.category ?? ""),
      };
    })
    .filter(Boolean) as PublicGalleryRow[];
}

function mapProjectsFromRpc(raw: unknown): PublicProjectRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id ?? ""),
      name: String(row.name ?? ""),
      project_type: String(row.project_type ?? ""),
      location_region: String(row.location_region ?? ""),
      location_district: String(row.location_district ?? ""),
    };
  });
}

function mapLeadersFromRpc(raw: unknown): PublicNationalLeaderRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      role_key: String(row.role_key ?? ""),
      full_name: String(row.full_name ?? ""),
      profile_photo_url: String(row.profile_photo_url ?? ""),
      leadership_quote: String(row.leadership_quote ?? ""),
      display_title_sw: String(row.display_title_sw ?? ""),
    };
  });
}

/** Parse site_settings.gallery JSON into image rows (admin-curated URLs). */
export function parseSiteSettingsGalleryItems(gallery: unknown): PublicGalleryRow[] {
  if (!Array.isArray(gallery)) return [];
  const out: PublicGalleryRow[] = [];
  gallery.forEach((item, i) => {
    if (!item || typeof item !== "object") return;
    const o = item as Record<string, unknown>;
    const image_url = String(o.url ?? o.image_url ?? o.src ?? "").trim();
    if (!image_url) return;
    out.push({
      id: String(o.id ?? `site-${i}`),
      title: String(o.title ?? o.caption ?? "Picha"),
      image_url,
      category: String(o.category ?? "Umma"),
    });
  });
  return out;
}

export async function fetchPublicLandingContent(): Promise<PublicLandingContent> {
  const c = getSupabase();
  const empty: PublicLandingContent = {
    news: [],
    events: [],
    documents: [],
    liveNow: [],
    sermons: [],
    gallery: [],
    projects: [],
    videos: [],
    audios: [],
    leaders: [],
    counts: {
      counts: null,
      error: null,
      attendanceColumnsFromRpc: false,
      majimboActiveColumnFromRpc: false,
    },
  };
  if (!c) return empty;

  const [
    newsRes,
    eventsRes,
    docsRes,
    liveRes,
    sermonsRes,
    videosRes,
    audiosRes,
    galleryRpc,
    projectsRpc,
    leadersRpc,
    countsPack,
  ] = await Promise.all([
    c
      .from("news_posts")
      .select("id,title,created_at,summary,featured")
      .eq("status", "published")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(8),
    c
      .from("events")
      .select("id,title,event_date,location,description")
      .eq("is_public", true)
      .in("status", ["upcoming", "ongoing"])
      .order("event_date", { ascending: true })
      .limit(8),
    c
      .from("documents")
      .select("id,title,category,created_at")
      .eq("is_public", true)
      .in("status", ["active", "published"])
      .order("created_at", { ascending: false })
      .limit(6),
    c.from("live_streams").select("id,title,stream_url").eq("is_public", true).eq("is_live", true).limit(2),
    c.from("sermons").select("id,title,preacher,date").in("status", ["active", "published"]).order("date", { ascending: false }).limit(6),
    c.from("videos").select("id,title,video_url,thumbnail_url").eq("is_public", true).eq("status", "active").order("created_at", { ascending: false }).limit(6),
    c.from("audios").select("id,title,audio_url").eq("is_public", true).eq("status", "active").order("created_at", { ascending: false }).limit(6),
    c.rpc("portal_public_gallery_list", { p_limit: 12 }).then((r) => r),
    c.rpc("portal_public_projects_list", { p_limit: 8 }).then((r) => r),
    c.rpc("portal_public_national_leadership").then((r) => r),
    fetchPortalPublicDashboardCountsCached(),
  ]);

  const gallery = mapGalleryFromRpc(galleryRpc.data);

  return {
    news: ((newsRes.error ? [] : newsRes.data) ?? []) as PublicNewsRow[],
    events: ((eventsRes.error ? [] : eventsRes.data) ?? []) as PublicEventRow[],
    documents: ((docsRes.error ? [] : docsRes.data) ?? []) as PublicDocRow[],
    liveNow: ((liveRes.error ? [] : liveRes.data) ?? []) as PublicLiveRow[],
    sermons: ((sermonsRes.error ? [] : sermonsRes.data) ?? []) as PublicSermonRow[],
    gallery,
    projects: mapProjectsFromRpc(projectsRpc.data),
    videos: ((videosRes.error ? [] : videosRes.data) ?? []) as PublicVideoRow[],
    audios: ((audiosRes.error ? [] : audiosRes.data) ?? []) as PublicAudioRow[],
    leaders: mapLeadersFromRpc(leadersRpc.data),
    counts: countsPack,
  };
}
