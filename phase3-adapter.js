import { getState, moduleSchemas, updateModuleRows } from "./phase3-store.js";
import { getSupabaseClient } from "./phase3-supabase.js";

function shouldUseSupabase() {
  return !!getSupabaseClient();
}

function tableName(moduleKey) {
  return moduleSchemas[moduleKey]?.table || moduleKey;
}

export const ApiAdapter = {
  async list(moduleKey) {
    if (!shouldUseSupabase()) {
      const rows = getState().moduleRows[moduleKey] || [];
      return Promise.resolve([...rows]);
    }
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from(tableName(moduleKey)).select("*").order("id", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(moduleKey, payload) {
    if (!shouldUseSupabase()) {
      const rows = getState().moduleRows[moduleKey] || [];
      const next = [{ id: Date.now(), ...payload }, ...rows];
      updateModuleRows(moduleKey, next);
      return next[0];
    }
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from(tableName(moduleKey)).insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async update(moduleKey, id, payload) {
    if (!shouldUseSupabase()) {
      const rows = getState().moduleRows[moduleKey] || [];
      const next = rows.map((r) => (r.id === id ? { ...r, ...payload } : r));
      updateModuleRows(moduleKey, next);
      return next.find((r) => r.id === id) || null;
    }
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from(tableName(moduleKey)).update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },

  async remove(moduleKey, id) {
    if (!shouldUseSupabase()) {
      const rows = getState().moduleRows[moduleKey] || [];
      const next = rows.filter((r) => r.id !== id);
      updateModuleRows(moduleKey, next);
      return true;
    }
    const supabase = getSupabaseClient();
    const { error } = await supabase.from(tableName(moduleKey)).delete().eq("id", id);
    if (error) throw error;
    return true;
  },

  async clear(moduleKey) {
    if (!shouldUseSupabase()) {
      updateModuleRows(moduleKey, []);
      return true;
    }
    const supabase = getSupabaseClient();
    const { error } = await supabase.from(tableName(moduleKey)).delete().neq("id", -1);
    if (error) throw error;
    return true;
  },
};
