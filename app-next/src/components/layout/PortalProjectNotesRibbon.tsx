import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, StickyNote } from "lucide-react";
import { usePortal } from "../../context/PortalContext";
import { getSupabase, isSupabaseRealtimeEnabled } from "../../lib/supabaseClient";
import { fetchPortalProjectNotes, savePortalProjectNotes, type PortalProjectNotesRow } from "../../services/portalProjectNotesService";

const STORAGE_EXPANDED = "kmt-portal-project-notes-expanded";
const MAX_CHARS = 12000;

type Props = {
  /** Onyesha tu wakati mtumiaji ana moduli angalau moja ya kuona */
  show: boolean;
};

export function PortalProjectNotesRibbon(props: Props) {
  const { pushToast, reportError, supabaseReady, canPortalManageSettingsModule, canPortalEditModule, logAudit } = usePortal();
  const canEditNotes = canPortalManageSettingsModule("mipangilio") && canPortalEditModule("mipangilio");

  const [expanded, setExpanded] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(STORAGE_EXPANDED) === "1";
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState<PortalProjectNotesRow | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const mounted = useRef(true);

  const setExpandedPersist = useCallback((v: boolean) => {
    setExpanded(v);
    try {
      sessionStorage.setItem(STORAGE_EXPANDED, v ? "1" : "0");
    } catch {
      /* optional */
    }
  }, []);

  const load = useCallback(async () => {
    if (!props.show) return;
    setLoading(true);
    try {
      const r = await fetchPortalProjectNotes();
      if (!mounted.current) return;
      setRow(r);
      setDraft(r?.body ?? "");
    } catch (e) {
      reportError(e, "Maelezo ya mradi — pakua");
      if (mounted.current) {
        setRow(null);
        setDraft("");
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [props.show, reportError]);

  useEffect(() => {
    mounted.current = true;
    if (!props.show) return;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [props.show, load]);

  useEffect(() => {
    if (!props.show || !supabaseReady || !isSupabaseRealtimeEnabled()) return;
    const client = getSupabase();
    if (!client) return;
    const ch = client
      .channel("portal-project-notes-live")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "portal_project_notes", filter: "singleton_key=eq.default" },
        () => {
          void load();
        }
      )
      .subscribe();
    return () => {
      void client.removeChannel(ch);
    };
  }, [props.show, supabaseReady, load]);

  const updatedLabel = useMemo(() => {
    if (!row?.updated_at) return null;
    try {
      return new Date(row.updated_at).toLocaleString("sw-TZ", { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return row.updated_at;
    }
  }, [row?.updated_at]);

  async function onSave() {
    if (!canEditNotes || saving) return;
    if (draft.length > MAX_CHARS) {
      pushToast(`Maelezo ni marefu sana (kikomo ${MAX_CHARS} herufi).`, "error");
      return;
    }
    setSaving(true);
    try {
      const saved = await savePortalProjectNotes(draft);
      setRow(saved);
      setDraft(saved.body);
      setEditing(false);
      pushToast("Maelezo ya mradi yamehifadhiwa.", "success");
      await logAudit("portal_project_notes_update", "portal_project_notes", saved.id, {
        length: saved.body.length,
      });
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Hifadhi imeshindikana.", "error");
      reportError(e, "Maelezo ya mradi — hifadhi");
    } finally {
      setSaving(false);
    }
  }

  if (!props.show) return null;

  return (
    <section
      className="mb-4 overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/95 via-white to-slate-50/90 shadow-sm ring-1 ring-amber-100/80"
      aria-label="Maelezo ya mradi"
    >
      <button
        type="button"
        id="portal-project-notes-toggle"
        aria-expanded={expanded}
        aria-controls="portal-project-notes-panel"
        onClick={() => setExpandedPersist(!expanded)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-amber-50/60"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-[#0B1F3A]">
          <StickyNote className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
          Maelezo ya mradi (ya kila mtu)
        </span>
        <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" aria-hidden /> : null}
          {expanded ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
        </span>
      </button>

      {expanded ? (
        <div id="portal-project-notes-panel" role="region" aria-labelledby="portal-project-notes-toggle" className="border-t border-amber-100/90 px-4 pb-4 pt-1">
          <p className="mb-2 text-xs leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-800">Kusoma:</span> kila mtumiaji wa portal anaweza kuona maelezo haya.
            <span className="mx-1 text-amber-700">·</span>
            <span className="font-semibold text-slate-800">Kuhariri:</span> wasimamizi wenye ruhusa ya{" "}
            <span className="whitespace-nowrap">Mipangilio → hariri + mipangilio mikuu</span> pekee.
          </p>

          {editing && canEditNotes ? (
            <div className="space-y-2">
              <label className="grid gap-1 text-xs font-semibold text-slate-700" htmlFor="portal-project-notes-textarea">
                Maudhui
              </label>
              <textarea
                id="portal-project-notes-textarea"
                rows={8}
                maxLength={MAX_CHARS}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-900 shadow-inner outline-none ring-0 placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200/60"
                style={{ lineHeight: 1.65 }}
                placeholder="Andika maelezo ya mradi, ratiba, viashiria vya uendeshaji, nk. Herufi zote za portal zitaona haya bila kuhariri."
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">
                  {draft.length} / {MAX_CHARS}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setDraft(row?.body ?? "");
                      setEditing(false);
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Ghairi
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void onSave()}
                    className="rounded-xl bg-[#0B1F3A] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#123C69] disabled:opacity-50"
                  >
                    {saving ? "Inahifadhi…" : "Hifadhi maelezo"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div
                className="min-h-[4.5rem] whitespace-pre-wrap rounded-xl border border-slate-100 bg-white/90 px-3 py-2.5 text-sm leading-relaxed text-slate-800"
                style={{ lineHeight: 1.65 }}
              >
                {loading ? "Inapakia…" : row?.body?.trim() ? row.body : "Bado hakuna maelezo. Wasimamizi wenye ruhusa wanaweza kuongeza hapa taarifa za mradi, ratiba, au maelekezo ya jumla."}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-slate-500">{updatedLabel ? `Mara ya mwisho: ${updatedLabel}` : null}</p>
                {canEditNotes ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(row?.body ?? "");
                      setEditing(true);
                    }}
                    className="rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100"
                  >
                    Hariri maelezo
                  </button>
                ) : (
                  <span className="text-[11px] font-medium text-slate-400">Huna ruhusa ya kuhariri</span>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
