import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, CheckCheck, ChevronRight, Loader2 } from "lucide-react";
import { usePortal } from "../../context/PortalContext";
import { getSupabase, isSupabaseRealtimeEnabled } from "../../lib/supabaseClient";
import { stage2GradHeader } from "../../lib/stage2Theme";
import { fetchNotificationsWithReadState, markAllNotificationsRead, markNotificationRead } from "../../services/notificationsService";
import type { PortalNotificationRow } from "../../types";
import { notificationTypeMeta, priorityMeta } from "./notificationUi";

function timeAgo(ts: string): string {
  const sec = Math.max(1, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

interface Props {
  onOpenFullPage: () => void;
}

export function NotificationBell({ onOpenFullPage }: Props) {
  const { reportError, pushToast, canPortalViewModule, authInitialized, authUser } = usePortal();
  const canView = canPortalViewModule("notifications");

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PortalNotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    if (!getSupabase() || !canView) {
      setItems([]);
      setUnread(0);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchNotificationsWithReadState();
      setItems(rows);
      setUnread(rows.filter((r) => !r.read_by_me).length);
    } catch (e) {
      reportError(e, "Arifa — jedwali");
      setItems([]);
      setUnread(0);
    } finally {
      setLoading(false);
    }
  }, [canView, reportError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isSupabaseRealtimeEnabled()) return;
    if (!authInitialized || !authUser || !getSupabase() || !canView) return;
    const client = getSupabase()!;
    const channel = client
      .channel("portal-notif-bell-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "notification_reads" }, () => void refresh())
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [canView, refresh, authInitialized, authUser]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const preview = useMemo(() => {
    return [...items]
      .sort((a, b) => {
        if (a.read_by_me !== b.read_by_me) return a.read_by_me ? 1 : -1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .slice(0, 10);
  }, [items]);

  const onMarkOne = async (id: string) => {
    try {
      await markNotificationRead(id);
      pushToast("Umesoma taarifa.", "success");
      await refresh();
    } catch (e) {
      reportError(e, "Arifa — soma");
    }
  };

  const onMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      pushToast("Taarifa zote zimewekwa kama zimesomwa.", "success");
      await refresh();
      setOpen(false);
    } catch (e) {
      reportError(e, "Arifa — soma zote");
    }
  };

  if (!canView) return null;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-xl border border-slate-200 bg-white/90 p-2 text-slate-800 shadow-sm hover:bg-slate-50"
        aria-label="Arifa"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5 text-[#0B3C5D]" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] animate-pulse items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-amber-200/80 bg-white/95 shadow-2xl backdrop-blur-md"
          >
            <div className={`flex items-center justify-between px-4 py-3 text-white ${stage2GradHeader}`}>
              <span className="text-sm font-bold">Taarifa</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={unread === 0 || loading}
                  onClick={() => void onMarkAll()}
                  className="rounded-lg bg-white/15 px-2 py-1 text-[11px] font-semibold hover:bg-white/25 disabled:opacity-40"
                  title="Weka zote zimesomwa"
                >
                  <CheckCheck className="inline h-3.5 w-3.5" /> Zote
                </button>
              </div>
            </div>

            <div className="max-h-[min(70vh,420px)] overflow-y-auto">
              {loading && items.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Inapakia…
                </div>
              ) : preview.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">Hakuna taarifa bado.</p>
              ) : (
                preview.map((n) => {
                  const meta = notificationTypeMeta(n.type);
                  const pMeta = priorityMeta(n.priority);
                  const Icon = meta.Icon;
                  return (
                    <div
                      key={n.id}
                      className={`border-b border-slate-100 px-3 py-2.5 transition hover:bg-amber-50/80 ${
                        !n.read_by_me ? "bg-[#FDFBF7]" : ""
                      }`}
                    >
                      <div className="flex gap-2">
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${meta.chip}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-semibold text-slate-900">{n.title}</p>
                          <p className="line-clamp-2 text-xs text-slate-600">{n.message}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${pMeta.chip}`}>{pMeta.label}</span>
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">{n.module}</span>
                            <span className="text-[10px] text-slate-500">{timeAgo(n.created_at)} ago</span>
                            {!n.read_by_me ? (
                              <button
                                type="button"
                                onClick={() => void onMarkOne(n.id)}
                                className="inline-flex items-center gap-1 rounded-lg bg-[#0B3C5D]/10 px-2 py-0.5 text-[11px] font-medium text-[#0B3C5D] hover:bg-[#0B3C5D]/20"
                              >
                                <Check className="h-3 w-3" /> Soma
                              </button>
                            ) : (
                              <span className="text-[10px] text-emerald-700">Imesomwa</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenFullPage();
              }}
              className="flex w-full items-center justify-center gap-2 border-t border-slate-100 bg-slate-50/90 px-3 py-2.5 text-sm font-semibold text-[#0B3C5D] hover:bg-slate-100"
            >
              Fungua ukurasa kamili
              <ChevronRight className="h-4 w-4" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
