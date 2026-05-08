import { getSafeSupabase } from "../phase-integration-core.js";

export function useRealtimePlaceholder(channelName, tables = [], onChange = () => {}) {
  const s = getSafeSupabase();
  if (!s || typeof s.channel !== "function") return { mode: "mock", unsubscribe: () => {} };
  const ch = s.channel(channelName);
  tables.forEach((table) => {
    ch.on("postgres_changes", { event: "*", schema: "public", table }, onChange);
  });
  ch.subscribe(() => {});
  return {
    mode: "live",
    unsubscribe: () => {
      if (typeof s.removeChannel === "function") s.removeChannel(ch);
    },
  };
}
