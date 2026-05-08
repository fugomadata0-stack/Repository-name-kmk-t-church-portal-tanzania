import { getSafeSupabase } from "./phase-integration-core.js";

const state = {
  mode: "mock",
  media: [{ id: 1, thumbnail: "thumb-1", title: "Nguvu ya Maombi", type: "Video", category: "Mahubiri", dayosisi: "Dar es Salaam", jimbo: "Kati", tawi: "Amani", speaker: "Mch. Daniel", date: "2026-04-26", visibility: "public", status: "published", tags: "maombi,imani" }],
  featured: [{ id: 1, media_id: 1, title: "Nguvu ya Maombi", speaker: "Mch. Daniel", scripture: "Yakobo 5:16", duration: "45m", thumbnail: "thumb-1" }],
  categories: [{ id: 1, name: "Mahubiri" }, { id: 2, name: "Mafundisho" }],
  streams: [{ id: 1, title: "Sunday Live Service", kind: "current", schedule: "2026-04-27 09:00" }],
};

const useSupabase = () => !!getSafeSupabase();
export const getMode = () => state.mode;

export async function loadMediaData() {
  if (!useSupabase()) { state.mode = "mock"; return; }
  state.mode = "supabase";
  const s = getSafeSupabase();
  const [items, featured, categories, streams] = await Promise.all([
    s.from("media_items").select("*").order("id", { ascending: false }),
    s.from("sermon_featured").select("*").order("id", { ascending: false }),
    s.from("media_categories").select("*").order("id", { ascending: false }),
    s.from("live_stream_sessions").select("*").order("id", { ascending: false }),
  ]);
  if (!items.error) state.media = items.data || [];
  if (!featured.error) state.featured = featured.data || [];
  if (!categories.error) state.categories = categories.data || [];
  if (!streams.error) state.streams = streams.data || [];
}

function arr(k) { return [...state[k]]; }
async function save(k, payload, id = null) {
  if (!useSupabase()) {
    if (id) state[k] = state[k].map((x) => (x.id === id ? { ...x, ...payload } : x));
    else state[k].unshift({ id: Date.now(), ...payload });
    return;
  }
  const table = k === "media" ? "media_items" : k === "featured" ? "sermon_featured" : k === "categories" ? "media_categories" : "live_stream_sessions";
  const s = getSafeSupabase();
  const q = id ? s.from(table).update(payload).eq("id", id) : s.from(table).insert(payload);
  const { error } = await q; if (error) throw error; await loadMediaData();
}
async function del(k, id) {
  if (!useSupabase()) { state[k] = state[k].filter((x) => x.id !== id); return; }
  const table = k === "media" ? "media_items" : k === "featured" ? "sermon_featured" : k === "categories" ? "media_categories" : "live_stream_sessions";
  const { error } = await getSafeSupabase().from(table).delete().eq("id", id); if (error) throw error; await loadMediaData();
}
async function clear(k) {
  if (!useSupabase()) { state[k] = []; return; }
  const table = k === "media" ? "media_items" : k === "featured" ? "sermon_featured" : k === "categories" ? "media_categories" : "live_stream_sessions";
  const { error } = await getSafeSupabase().from(table).delete().neq("id", -1); if (error) throw error; await loadMediaData();
}

export const getMedia = () => arr("media");
export const getFeatured = () => arr("featured");
export const getCategories = () => arr("categories");
export const getStreams = () => arr("streams");
export const saveMedia = (p, id) => save("media", p, id);
export const saveFeatured = (p, id) => save("featured", p, id);
export const saveCategory = (p, id) => save("categories", p, id);
export const saveStream = (p, id) => save("streams", p, id);
export const deleteMedia = (id) => del("media", id);
export const clearMedia = () => clear("media");

export async function logMediaActivity(role, action, description, payload = {}) {
  if (!useSupabase()) return;
  await getSafeSupabase().from("media_logs").insert({ actor_role: role, action, description, payload });
}
