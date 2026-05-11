import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { usePortal } from "../../context/PortalContext";
import { dispatchPortalReloadMetrics } from "../../lib/portalEvents";
import { downloadLeaderProfilePdf, downloadLeadershipDirectoryPdf } from "../../lib/leadershipPdf";
import { fetchChurchViongozi } from "../../services/viongoziService";
import {
  fetchCommitteeGroups,
  fetchLeadershipCategories,
  fetchLeadershipPositions,
  insertCommitteeGroup,
  insertLeadershipCategory,
  insertLeadershipPosition,
  subscribeLeadershipEnterprise,
} from "../../services/leadershipEnterpriseService";
import type { DayosisiRecord, JimboRecord, KiongoziRecord, LeadershipCategoryRecord, LeadershipCommitteeRecord, LeadershipPositionRecord, TawiRecord } from "../../types";

const LEVEL_PRESETS = [
  "KMK(T) National Level",
  "Dayosisi Level",
  "Jimbo Level",
  "Tawi/Kituo Level",
  "Idara Level",
  "Huduma Level",
  "Taasisi Level",
  "Jumuiya Level",
] as const;

type TabKey = "positions" | "committees" | "cards" | "pdf";

export function EnterpriseLeadershipHub(props: {
  viongozi: KiongoziRecord[];
  setViongozi: Dispatch<SetStateAction<KiongoziRecord[]>>;
  dayosisi: DayosisiRecord[];
  majimbo: JimboRecord[];
  matawi: TawiRecord[];
  canCreate: boolean;
  canEdit: boolean;
}) {
  const { pushToast, reportError, about, supabaseReady } = usePortal();
  const churchName = about.church_name?.trim() || undefined;
  const setViongozi = props.setViongozi;
  const [tab, setTab] = useState<TabKey>("positions");
  const [positions, setPositions] = useState<LeadershipPositionRecord[]>([]);
  const [categories, setCategories] = useState<LeadershipCategoryRecord[]>([]);
  const [committees, setCommittees] = useState<LeadershipCommitteeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pdfLeaderId, setPdfLeaderId] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [savingPosition, setSavingPosition] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingCommittee, setSavingCommittee] = useState(false);
  const [liveSync, setLiveSync] = useState<"idle" | "pending" | "synced" | "error">("idle");
  const [cDayo, setCDayo] = useState("");
  const [cJimbo, setCJimbo] = useState("");
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const reloadMeta = useCallback(async () => {
    try {
      const [p, c, g] = await Promise.all([fetchLeadershipPositions(), fetchLeadershipCategories(), fetchCommitteeGroups()]);
      setPositions(p);
      setCategories(c);
      setCommittees(g);
    } catch (e) {
      reportError(e, "Leadership enterprise meta");
      throw e;
    }
  }, [reportError]);

  const reloadLeaders = useCallback(async () => {
    try {
      const rows = await fetchChurchViongozi();
      setViongozi(() => rows);
    } catch (e) {
      reportError(e, "Viongozi refresh");
      throw e;
    }
  }, [setViongozi, reportError]);

  const scheduleRealtimeRefresh = useCallback(() => {
    if (!mountedRef.current) return;
    setLiveSync("pending");
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      syncTimerRef.current = null;
      if (!mountedRef.current) return;
      void Promise.all([reloadMeta(), reloadLeaders()])
        .then(() => {
          if (mountedRef.current) {
            setLiveSync("synced");
            dispatchPortalReloadMetrics();
          }
        })
        .catch(() => {
          if (mountedRef.current) setLiveSync("error");
        });
    }, 420);
  }, [reloadMeta, reloadLeaders]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        await reloadMeta();
      } catch {
        /* reportError ndani ya reloadMeta */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadMeta]);

  useEffect(() => {
    if (supabaseReady) setLiveSync((s) => (s === "idle" ? "synced" : s));
  }, [supabaseReady]);

  useEffect(() => {
    if (!supabaseReady) {
      setLiveSync("idle");
      return;
    }
    mountedRef.current = true;
    const ch = subscribeLeadershipEnterprise({
      onPositions: () => scheduleRealtimeRefresh(),
      onCategories: () => scheduleRealtimeRefresh(),
      onCommittees: () => scheduleRealtimeRefresh(),
      onLeaders: () => scheduleRealtimeRefresh(),
      onSubscribeStatus: (status) => {
        if (!mountedRef.current) return;
        if (status === "SUBSCRIBED") setLiveSync("synced");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setLiveSync("error");
        else if (status === "CLOSED") setLiveSync("idle");
      },
    });
    return () => {
      mountedRef.current = false;
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      if (ch) ch.unsubscribe();
    };
  }, [supabaseReady, scheduleRealtimeRefresh]);

  const filteredLeaders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return props.viongozi;
    return props.viongozi.filter((r) => {
      const blob = `${r.jina} ${r.cheo} ${r.leadership_level ?? ""} ${r.ngazi} ${r.assigned_entity ?? ""} ${r.dayosisi} ${r.jimbo} ${r.tawi}`.toLowerCase();
      return blob.includes(q);
    });
  }, [props.viongozi, search]);

  const jimboForCommittee = useMemo(
    () => props.majimbo.filter((j) => !cDayo || j.dayosisi_id === cDayo),
    [props.majimbo, cDayo]
  );
  const tawiForCommittee = useMemo(
    () => props.matawi.filter((t) => !cJimbo || t.jimbo_id === cJimbo),
    [props.matawi, cJimbo]
  );

  const tabBtn = (k: TabKey, label: string) => (
    <button
      type="button"
      key={k}
      role="tab"
      aria-selected={tab === k}
      onClick={() => setTab(k)}
      className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
        tab === k ? "bg-[#0B1F3A] text-white shadow-md" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );

  const liveBadge =
    !supabaseReady ? (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">Supabase haijasajiliwa</span>
    ) : liveSync === "error" ? (
      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800">Realtime — hitilafu</span>
    ) : liveSync === "pending" ? (
      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-900">Inasasisha…</span>
    ) : liveSync === "synced" ? (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-900">Live · data imesasishwa</span>
    ) : (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">Live tayari</span>
    );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-4 shadow-sm">
        <h2 className="text-lg font-bold text-[#0B1F3A]">Uongozi wa kina — Enterprise</h2>
        <p className="mt-1 text-sm text-slate-600">
          Nafasi zisizo na kikomo, makamati, kadi za wanaoishi, na PDF rasmi zinazoishi na Supabase (realtime). Ruhusa zinaheshimiwa kulingana na kipengele cha{" "}
          <strong>viongozi</strong> na mipaka ya dayosisi/jimbo/tawi.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2" role="tablist">
          {tabBtn("positions", "Nafasi & makundi")}
          {tabBtn("committees", "Makamati")}
          {tabBtn("cards", "Kadi")}
          {tabBtn("pdf", "PDF")}
          <span className="ml-auto shrink-0">{liveBadge}</span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">Inapakia mipangilio…</div>
      ) : null}

      {tab === "positions" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900">Ongeza nafasi ya uongozi</h3>
            <p className="mt-1 text-xs text-slate-500">Jina lolote linalowezekana — mfumo hauzingatii orodha fupi.</p>
            <form
              className="mt-3 grid gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!props.canCreate) {
                  pushToast("Huna ruhusa ya kuongeza nafasi.", "error");
                  return;
                }
                if (savingPosition) return;
                const fd = new FormData(e.currentTarget);
                setSavingPosition(true);
                try {
                  const row = await insertLeadershipPosition({
                    title: String(fd.get("title") ?? ""),
                    level_key: String(fd.get("level_key") ?? "") || null,
                    code: String(fd.get("code") ?? "") || null,
                    description: String(fd.get("description") ?? "") || null,
                    category_id: String(fd.get("category_id") ?? "") || null,
                  });
                  setPositions((prev) => [...prev, row].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.title.localeCompare(b.title)));
                  pushToast("Nafasi imeongezwa.", "success");
                  (e.target as HTMLFormElement).reset();
                } catch (err) {
                  reportError(err, "Nafasi mpya");
                } finally {
                  setSavingPosition(false);
                }
              }}
            >
              <label className="grid gap-1 text-xs">
                Jina la nafasi *
                <input name="title" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="mf. Mwenyekiti wa Vijana" />
              </label>
              <label className="grid gap-1 text-xs">
                Ngazi inayofaa
                <select name="level_key" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <option value="">— Yoyote —</option>
                  {LEVEL_PRESETS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs">
                Kodi fupi (hiari)
                <input name="code" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Kundi la uongozi (hiari)
                <select name="category_id" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs md:col-span-2">
                Maelezo
                <textarea name="description" rows={2} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </label>
              {props.canCreate ? (
                <button
                  type="submit"
                  disabled={savingPosition}
                  className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingPosition ? "Inahifadhi…" : "Hifadhi nafasi"}
                </button>
              ) : (
                <p className="text-xs text-amber-700">Huna ruhusa ya kuongeza.</p>
              )}
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900">Ongeza kundi la uongozi</h3>
            <form
              className="mt-3 grid gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!props.canCreate) {
                  pushToast("Huna ruhusa.", "error");
                  return;
                }
                if (savingCategory) return;
                const fd = new FormData(e.currentTarget);
                setSavingCategory(true);
                try {
                  const row = await insertLeadershipCategory({
                    name: String(fd.get("name") ?? ""),
                    level_key: String(fd.get("lc_level") ?? "") || null,
                    description: String(fd.get("lc_desc") ?? "") || null,
                  });
                  setCategories((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
                  pushToast("Kundi limeongezwa.", "success");
                  (e.target as HTMLFormElement).reset();
                } catch (err) {
                  reportError(err, "Kundi la uongozi");
                } finally {
                  setSavingCategory(false);
                }
              }}
            >
              <label className="grid gap-1 text-xs">
                Jina la kundi *
                <input name="name" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="mf. Baraza la Fedha" />
              </label>
              <label className="grid gap-1 text-xs">
                Ngazi
                <select name="lc_level" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <option value="">—</option>
                  {LEVEL_PRESETS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs">
                Maelezo
                <textarea name="lc_desc" rows={2} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </label>
              {props.canCreate ? (
                <button
                  type="submit"
                  disabled={savingCategory}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingCategory ? "Inahifadhi…" : "Hifadhi kundi"}
                </button>
              ) : null}
            </form>
            <div className="mt-4 max-h-48 overflow-auto rounded-lg border border-slate-100">
              <ul className="divide-y divide-slate-100 text-xs">
                {positions.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2 px-2 py-1.5">
                    <span className="font-medium text-slate-800">{p.title}</span>
                    <span className="flex shrink-0 items-center gap-1 text-slate-500">
                      {!p.active ? (
                        <span className="rounded bg-slate-200 px-1 text-[9px] font-semibold uppercase text-slate-600">inactive</span>
                      ) : null}
                      <span>{p.level_key || "—"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "committees" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Kikundi cha kamati / ofisi</h3>
          <form
            className="mt-3 grid gap-2 md:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!props.canCreate) {
                pushToast("Huna ruhusa.", "error");
                return;
              }
              if (savingCommittee) return;
              const fd = new FormData(e.currentTarget);
              setSavingCommittee(true);
              try {
                const row = await insertCommitteeGroup({
                  name: String(fd.get("cname") ?? ""),
                  level_key: String(fd.get("clevel") ?? "") || null,
                  description: String(fd.get("cdesc") ?? "") || null,
                  dayosisi_id: String(fd.get("cdayo") ?? "") || null,
                  jimbo_id: String(fd.get("cjimbo") ?? "") || null,
                  tawi_id: String(fd.get("ctawi") ?? "") || null,
                });
                setCommittees((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
                pushToast("Kikundi kimeongezwa.", "success");
                setCDayo("");
                setCJimbo("");
                (e.target as HTMLFormElement).reset();
              } catch (err) {
                reportError(err, "Kamati");
              } finally {
                setSavingCommittee(false);
              }
            }}
          >
            <label className="grid gap-1 text-xs md:col-span-2">
              Jina *
              <input name="cname" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="grid gap-1 text-xs">
              Ngazi
              <select name="clevel" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="">—</option>
                {LEVEL_PRESETS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs md:col-span-2">
              Maelezo
              <textarea name="cdesc" rows={2} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="grid gap-1 text-xs">
              Dayosisi
              <select
                name="cdayo"
                value={cDayo}
                onChange={(e) => {
                  setCDayo(e.target.value);
                  setCJimbo("");
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {props.dayosisi.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.jina}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs">
              Jimbo
              <select
                name="cjimbo"
                value={cJimbo}
                onChange={(e) => setCJimbo(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {jimboForCommittee.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.jina}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs md:col-span-2">
              Tawi
              <select key={`ctawi-${cJimbo}`} name="ctawi" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" defaultValue="">
                <option value="">—</option>
                {tawiForCommittee.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.jina}
                  </option>
                ))}
              </select>
            </label>
            {props.canCreate ? (
              <button
                type="submit"
                disabled={savingCommittee}
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2"
              >
                {savingCommittee ? "Inahifadhi…" : "Hifadhi kikundi"}
              </button>
            ) : null}
          </form>
          <ul className="mt-4 max-h-56 divide-y divide-slate-100 overflow-auto text-xs">
            {committees.map((c) => (
              <li key={c.id} className="py-2">
                <div className="font-semibold text-slate-800">{c.name}</div>
                <div className="text-slate-500">{c.level_key || "Ngazi haijabainishwa"}</div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === "cards" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tafuta kwa jina, cheo, ngazi…"
              className="min-w-[200px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <span className="text-xs text-slate-500">{filteredLeaders.length} wamepatikana</span>
          </div>
          {filteredLeaders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-600">
              Hakuna viongozi wanaolingana na utafutaji. Badilisha neno au ongeza rekodi kutoka kipengele kingine cha Viongozi.
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredLeaders.map((L) => (
              <article
                key={L.id}
                className="flex min-h-[300px] flex-col items-center rounded-2xl border border-violet-200/80 bg-gradient-to-b from-violet-100/80 via-white to-indigo-50 p-4 text-center shadow-md ring-1 ring-violet-300/50"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white shadow ring-2 ring-violet-300">
                  {L.photo_url ? (
                    <img src={L.photo_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-200 text-2xl font-bold text-slate-500">
                      {(L.jina || "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <h4
                  className="mt-3 line-clamp-3 min-h-[3.25rem] w-full break-words text-sm font-bold leading-snug text-[#0B1F3A]"
                  title={L.jina}
                >
                  {L.jina}
                </h4>
                <span
                  className="mt-1 line-clamp-2 max-w-full break-words rounded-full bg-violet-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                  title={L.cheo}
                >
                  {L.cheo}
                </span>
                <p className="mt-1 line-clamp-2 min-h-[2rem] w-full break-words text-[11px] leading-snug text-slate-600" title={L.leadership_level || L.ngazi || ""}>
                  {L.leadership_level || L.ngazi}
                </p>
                <span
                  className={`mt-2 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                    L.term_status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {L.term_status || "—"} · {L.status}
                </span>
                {L.signature_url ? (
                  <div className="mt-3 w-full rounded-lg border border-dashed border-slate-300 bg-white/80 p-2">
                    <p className="text-[10px] font-semibold text-slate-500">Saini</p>
                    <img src={L.signature_url} alt="" className="mx-auto mt-1 h-10 max-w-full object-contain" loading="lazy" />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "pdf" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">PDF rasmi — rangi, kichwa, QR, anayeitoa</h3>
          <p className="mt-1 text-xs text-slate-500">
            Hati zinatumia rangi za chama, kichwa kinachopungua font kiotomatiki, na QR ya uthibitisho (kiungo cha portal).
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pdfBusy || filteredLeaders.length === 0}
              className="rounded-xl bg-[#0B1F3A] px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-[#152a52] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={async () => {
                if (pdfBusy) return;
                setPdfBusy(true);
                try {
                  await downloadLeadershipDirectoryPdf(filteredLeaders, { churchName: churchName || undefined });
                  pushToast("PDF ya orodha imepakuliwa.", "success");
                } catch (e) {
                  reportError(e, "PDF directory");
                } finally {
                  setPdfBusy(false);
                }
              }}
            >
              {pdfBusy ? "Inatengeneza PDF…" : "Pakua orodha (filtered)"}
            </button>
          </div>
          <div className="mt-6 grid gap-2 md:max-w-md">
            <label className="grid gap-1 text-xs">
              Chagua kiongozi — wasifu binafsi
              <select value={pdfLeaderId} onChange={(e) => setPdfLeaderId(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="">—</option>
                {props.viongozi.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.jina} — {v.cheo}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={pdfBusy || !pdfLeaderId}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow disabled:cursor-not-allowed disabled:opacity-50"
              onClick={async () => {
                const L = props.viongozi.find((x) => x.id === pdfLeaderId);
                if (!L) {
                  pushToast("Chagua kiongozi kwanza.", "error");
                  return;
                }
                if (pdfBusy) return;
                setPdfBusy(true);
                try {
                  await downloadLeaderProfilePdf(L, { churchName: churchName || undefined });
                  pushToast("PDF ya wasifu imepakuliwa.", "success");
                } catch (e) {
                  reportError(e, "PDF wasifu");
                } finally {
                  setPdfBusy(false);
                }
              }}
            >
              {pdfBusy ? "Inatengeneza PDF…" : "Pakua wasifu wa kiongozi"}
            </button>
          </div>
        </div>
      ) : null}

      {!props.canEdit ? (
        <p className="text-center text-xs text-amber-800">Hariri ni ya kusoma pekee kwa jukumu lako; uwezo wa kuongeza/kuhariri unategemea RBAC.</p>
      ) : null}
    </div>
  );
}
