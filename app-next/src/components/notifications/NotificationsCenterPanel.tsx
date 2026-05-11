import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Download,
  Loader2,
  ExternalLink,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Eye,
  EyeOff,
  Filter,
} from "lucide-react";
import { usePortal } from "../../context/PortalContext";
import { getSupabase, isSupabaseRealtimeEnabled } from "../../lib/supabaseClient";
import { dispatchPortalReloadMetrics } from "../../lib/portalEvents";
import { stage2GradHeader } from "../../lib/stage2Theme";
import {
  createNotification,
  deleteNotification,
  fetchNotificationsWithReadState,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  updateNotification,
} from "../../services/notificationsService";
import type { PortalNotificationRow, PortalNotificationType, UserRole } from "../../types";
import { ConfirmModal } from "../common/ConfirmModal";
import { ModalScrollLayer } from "../common/ModalScrollLayer";
import { GlassPanel, MotionCard } from "../stage2/Stage2Motion";
import { NOTIFICATION_TYPE_OPTIONS, PRIORITY_OPTIONS, notificationTypeMeta, priorityMeta } from "./notificationUi";
import { safeArray, safeIncludes, safeLower } from "../../lib/safe";
import { exportRowsToExcel, exportTableToPdf, openPrintableTable } from "../../lib/exportHelpers";

const ROLE_KEYS: UserRole[] = [
  "super_admin",
  "chief_admin",
  "national_admin",
  "office_admin",
  "finance_admin",
  "secretary",
  "approver",
  "reviewer",
  "dayosisi_admin",
  "jimbo_admin",
  "tawi_admin",
  "viewer",
];

type ReadFilter = "ALL" | "READ" | "UNREAD";
type ScopeFilter = "ALL" | "GLOBAL" | "ROLE" | "USER";

export function NotificationsCenterPanel(props: { submodule?: string }) {
  const { reportError, pushToast, authUser, authInitialized, canPortalCreateModule, canPortalEditModule, canPortalDeleteModule } = usePortal();
  const canCreate = canPortalCreateModule("notifications");
  const canEdit = canPortalEditModule("notifications");
  const canDelete = canPortalDeleteModule("notifications");

  const [rows, setRows] = useState<PortalNotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [moduleFilter, setModuleFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [readFilter, setReadFilter] = useState<ReadFilter>("ALL");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("ALL");
  const [rolePick, setRolePick] = useState<string>("ALL");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<PortalNotificationRow | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<PortalNotificationType>("info");
  const [priority, setPriority] = useState<"info" | "success" | "warning" | "critical">("info");
  const [moduleKey, setModuleKey] = useState("general");
  const [isGlobal, setIsGlobal] = useState(false);
  const [targetRole, setTargetRole] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);
  const [delBusy, setDelBusy] = useState(false);

  useEffect(() => {
    const s = safeLower((props.submodule ?? "").trim());
    if (s.includes("zisizo")) setReadFilter("UNREAD");
    else setReadFilter("ALL");
  }, [props.submodule]);

  const load = useCallback(async () => {
    if (!getSupabase()) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRows(await fetchNotificationsWithReadState());
    } catch (e) {
      reportError(e, "Taarifa — orodha");
      pushToast("Imeshindikana kupakia taarifa.", "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [reportError, pushToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isSupabaseRealtimeEnabled()) return;
    if (!authInitialized || !authUser || !getSupabase()) return;
    const client = getSupabase()!;
    const channel = client
      .channel("portal-notif-page-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "notification_reads" }, () => void load())
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [load, authInitialized, authUser]);

  const filtered = useMemo(() => {
    const q = safeLower(search).trim();
    const mineOnly = safeIncludes(props.submodule ?? "", "zilizo") && authUser?.id;

    return safeArray(rows).filter((r) => {
      if (mineOnly && r.created_by !== authUser?.id) return false;

      if (readFilter === "READ" && !r.read_by_me) return false;
      if (readFilter === "UNREAD" && r.read_by_me) return false;

      if (scopeFilter === "GLOBAL" && !r.is_global) return false;
      if (scopeFilter === "ROLE" && !r.target_role) return false;
      if (scopeFilter === "ROLE" && rolePick !== "ALL" && r.target_role !== rolePick) return false;
      if (scopeFilter === "USER" && !r.target_user_id) return false;
      if (typeFilter !== "ALL" && r.type !== typeFilter) return false;
      if (moduleFilter !== "ALL" && r.module !== moduleFilter) return false;
      if (priorityFilter !== "ALL" && r.priority !== priorityFilter) return false;

      if (q && !safeIncludes(`${r.title ?? ""} ${r.message ?? ""}`, q)) return false;
      return true;
    });
  }, [rows, search, readFilter, scopeFilter, rolePick, props.submodule, authUser?.id, typeFilter, moduleFilter, priorityFilter]);

  const exportRows = useMemo(
    () =>
      filtered.map((r) => [
        r.title,
        r.message,
        r.type,
        r.module,
        r.priority,
        r.read_by_me ? "Read" : "Unread",
        new Date(r.created_at).toLocaleString("sw-TZ"),
      ]),
    [filtered]
  );

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setMessage("");
    setType("info");
    setPriority("info");
    setModuleKey("general");
    setIsGlobal(false);
    setTargetRole("");
    setTargetUserId("");
    setActionUrl("");
    setModal(true);
  };

  const openEdit = (r: PortalNotificationRow) => {
    setEditing(r);
    setTitle(String(r.title ?? ""));
    setMessage(String(r.message ?? ""));
    setType(r.type);
    setPriority(r.priority);
    setModuleKey(r.module);
    setIsGlobal(r.is_global);
    setTargetRole(r.target_role ?? "");
    setTargetUserId(r.target_user_id ?? "");
    setActionUrl(r.action_url ?? "");
    setModal(true);
  };

  const save = async () => {
    const t = title.trim();
    const m = message.trim();
    if (!t || !m) {
      pushToast("Jina na ujumbe vinahitajika.", "error");
      return;
    }
    setSaving(true);
    try {
      if (editing?.id) {
        const saved = await updateNotification(editing.id, {
          title: t,
          message: m,
          type,
          priority,
          module: moduleKey,
          is_global: isGlobal,
          target_role: isGlobal ? null : targetRole.trim() || null,
          target_user_id: isGlobal ? null : targetUserId.trim() || null,
          action_url: actionUrl.trim() || null,
        });
        setRows((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
        pushToast("Taarifa imehifadhiwa.", "success");
      } else {
        const saved = await createNotification({
          title: t,
          message: m,
          type,
          priority,
          module: moduleKey,
          is_global: isGlobal,
          target_role: isGlobal ? null : targetRole.trim() || null,
          target_user_id: isGlobal ? null : targetUserId.trim() || null,
          action_url: actionUrl.trim() || null,
        });
        setRows((prev) => [saved, ...prev]);
        pushToast("Taarifa imehifadhiwa.", "success");
      }
      dispatchPortalReloadMetrics();
      setModal(false);
    } catch (e) {
      reportError(e, "Taarifa — hifadhi");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!delId) return;
    setDelBusy(true);
    try {
      await deleteNotification(delId);
      setRows((prev) => prev.filter((x) => x.id !== delId));
      pushToast("Taarifa imefutwa.", "success");
      dispatchPortalReloadMetrics();
      setDelId(null);
    } catch (e) {
      reportError(e, "Taarifa — futa");
    } finally {
      setDelBusy(false);
    }
  };

  const toggleRead = async (r: PortalNotificationRow) => {
    try {
      if (r.read_by_me) {
        await markNotificationUnread(r.id);
        pushToast("Taarifa imewekwa kama haijasomwa.", "success");
      } else {
        await markNotificationRead(r.id);
        pushToast("Umesoma taarifa.", "success");
      }
      await load();
      dispatchPortalReloadMetrics();
    } catch (e) {
      reportError(e, "Taarifa — hali ya kusoma");
    }
  };

  const onMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      pushToast("Taarifa zote zimewekwa kama zimesomwa.", "success");
      await load();
      dispatchPortalReloadMetrics();
    } catch (e) {
      reportError(e, "Taarifa — soma zote");
    }
  };

  return (
    <div className="space-y-5">
      <header className={`rounded-2xl p-6 text-white shadow-xl ${stage2GradHeader}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-200/90">Stage 4</p>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold">
              <Bell className="h-7 w-7" />
              Notifications / Taarifa
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-blue-50/95">
              Arifa za mfumo — global, kwa jukumu, au kwa mtumiaji mmoja. Data halisi kutoka Supabase.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold ring-1 ring-white/30 hover:bg-white/25"
            >
              <RefreshCw className="h-4 w-4" />
              Pakua upya
            </button>
            <button
              type="button"
              onClick={() => void onMarkAll()}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400/90 px-4 py-2 text-sm font-bold text-[#0B3C5D] hover:bg-amber-300"
            >
              Soma zote
            </button>
            {canCreate ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                Ongeza
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <GlassPanel className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid min-w-[180px] flex-1 gap-1 text-xs font-medium text-slate-700">
            <span className="flex items-center gap-1">
              <Search className="h-3.5 w-3.5" />
              Tafuta
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Jina au ujumbe…"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700">
            <span className="flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" />
              Soma / bado
            </span>
            <select
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value as ReadFilter)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="ALL">Zote</option>
              <option value="UNREAD">Zisizosomwa</option>
              <option value="READ">Zilizosomwa</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700">
            Mwangalizi
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as ScopeFilter)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="ALL">Zote</option>
              <option value="GLOBAL">Global</option>
              <option value="ROLE">Kwa jukumu</option>
              <option value="USER">Kwa mtumiaji (UUID)</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700">
            Type
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="ALL">All</option>
              {NOTIFICATION_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700">
            Module
            <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="ALL">All</option>
              {Array.from(new Set(rows.map((r) => r.module))).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700">
            Priority
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="ALL">All</option>
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void exportRowsToExcel("KMKT-Notifications", ["Title", "Message", "Type", "Module", "Priority", "Status", "Time"], exportRows)}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5" /> Excel
          </button>
          <button
            type="button"
            onClick={() => void exportTableToPdf("KMK(T) Notifications", "KMKT-Notifications", ["Title", "Message", "Type", "Module", "Priority", "Status", "Time"], exportRows)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
          >
            PDF
          </button>
          <button
            type="button"
            onClick={() => openPrintableTable("KMK(T) Notifications", ["Title", "Message", "Type", "Module", "Priority", "Status", "Time"], exportRows)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
          >
            Print
          </button>
          {scopeFilter === "ROLE" ? (
            <label className="grid gap-1 text-xs font-medium text-slate-700">
              Jukumu
              <select
                value={rolePick}
                onChange={(e) => setRolePick(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="ALL">Vyote</option>
                {ROLE_KEYS.map((rk) => (
                  <option key={rk} value={rk}>
                    {rk}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </GlassPanel>

      {loading ? (
        <div
          className="flex min-h-[200px] items-center justify-center gap-2 text-slate-500"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
          Inapakia taarifa…
        </div>
      ) : filtered.length === 0 ? (
        <GlassPanel className="flex min-h-[220px] flex-col items-center justify-center gap-2 p-10 text-center">
          <Bell className="h-14 w-14 text-[#0B3C5D]/30" />
          <p className="text-lg font-semibold text-[#0B3C5D]">Hakuna taarifa</p>
          <p className="max-w-md text-sm text-slate-600">Badilisha vichujio au ongeza taarifa mpya.</p>
        </GlassPanel>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {filtered.map((r) => {
              const meta = notificationTypeMeta(r.type);
              const pMeta = priorityMeta(r.priority);
              const Icon = meta.Icon;
              const mine = r.created_by && authUser?.id === r.created_by;
              return (
                <MotionCard key={r.id}>
                  <div
                    className={`flex h-full flex-col rounded-2xl border border-white/50 bg-white/85 p-4 shadow backdrop-blur ${
                      !r.read_by_me ? "ring-1 ring-amber-300/80" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.chip}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex flex-wrap justify-end gap-1">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${pMeta.chip}`}>{pMeta.label}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">{meta.label}</span>
                      </div>
                    </div>
                    <h3 className="mt-2 line-clamp-2 font-bold text-slate-900">{r.title}</h3>
                    <p className="mt-1 line-clamp-4 text-sm text-slate-600">{r.message}</p>
                    <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-slate-500">
                      {r.is_global ? <span className="rounded bg-blue-50 px-1.5 py-0.5">Global</span> : null}
                      {r.target_role ? (
                        <span className="rounded bg-violet-50 px-1.5 py-0.5">Jukumu: {r.target_role}</span>
                      ) : null}
                      {r.target_user_id ? (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5">UUID: {r.target_user_id.slice(0, 8)}…</span>
                      ) : null}
                      {mine ? <span className="rounded bg-emerald-50 px-1.5 py-0.5">Yako</span> : null}
                      <span className="rounded bg-slate-100 px-1.5 py-0.5">Module: {r.module}</span>
                    </div>
                    <p className="mt-auto pt-3 text-[10px] text-slate-400">
                      {new Date(r.created_at).toLocaleString("sw-TZ")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.action_url ? (
                        <a
                          href={r.action_url}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-900"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Fungua
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void toggleRead(r)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium hover:bg-slate-50"
                      >
                        {r.read_by_me ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        {r.read_by_me ? "Weka bila kusoma" : "Weka kama imesomwa"}
                      </button>
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Hariri
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => setDelId(r.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-800"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Futa
                        </button>
                      ) : null}
                    </div>
                  </div>
                </MotionCard>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {modal ? (
        <ModalScrollLayer onBackdropClick={() => setModal(false)} maxWidthClass="max-w-lg">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full rounded-2xl border border-amber-200 bg-[#FDFBF7] p-5 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-[#0B3C5D]">{editing ? "Hariri taarifa" : "Taarifa mpya"}</h3>
            <div className="mt-3 grid gap-2">
              <label className="text-xs font-medium text-slate-700">
                Kichwa
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-medium text-slate-700">
                Ujumbe
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-medium text-slate-700">
                Aina
                <select value={type} onChange={(e) => setType(e.target.value as PortalNotificationType)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  {NOTIFICATION_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-700">
                Priority
                <select value={priority} onChange={(e) => setPriority(e.target.value as "info" | "success" | "warning" | "critical")} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-700">
                Module
                <input value={moduleKey} onChange={(e) => setModuleKey(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <input type="checkbox" checked={isGlobal} onChange={(e) => setIsGlobal(e.target.checked)} />
                Global (wote wenye ruhusa ya taarifa)
              </label>
              {!isGlobal ? (
                <>
                  <label className="text-xs font-medium text-slate-700">
                    Lenga jukumu (hiari)
                    <select value={targetRole} onChange={(e) => setTargetRole(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      <option value="">— Chagua —</option>
                      {ROLE_KEYS.map((rk) => (
                        <option key={rk} value={rk}>
                          {rk}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-medium text-slate-700">
                    User ID (UUID) maalum (hiari)
                    <input
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value)}
                      placeholder="auth.users id"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
                    />
                  </label>
                </>
              ) : null}
              <label className="text-xs font-medium text-slate-700">
                Action URL (hiari)
                <input
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  placeholder="/module/path au https://..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setModal(false)} className="rounded-xl border px-4 py-2 text-sm">
                Ghairi
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="rounded-xl bg-[#0B3C5D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Inahifadhi…" : "Hifadhi"}
              </button>
            </div>
          </motion.div>
        </ModalScrollLayer>
      ) : null}

      <ConfirmModal
        open={!!delId}
        title="Futa taarifa?"
        message="Hatua hii haiwezi kutenduliwa."
        confirmLoading={delBusy}
        onCancel={() => setDelId(null)}
        onConfirm={() => void onDelete()}
      />
    </div>
  );
}
