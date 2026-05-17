import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  CalendarClock,
  Mail,
  Megaphone,
  MousePointerClick,
  Send,
  Smartphone,
  Trash2,
  Users,
  XCircle,
  Loader2,
  FileText,
  Activity,
  RefreshCw,
} from "lucide-react";
import { dispatchPortalReloadMetrics } from "../../lib/portalEvents";
import { usePortal } from "../../context/PortalContext";
import { getSupabase } from "../../lib/supabaseClient";
import { SUPABASE_QUERY_ERROR_SW } from "../../lib/supabaseUiMessages";
import { STAGE2_COLORS } from "../../lib/stage2Theme";
import {
  clearCommunicationPrefill,
  dedupeRecipients,
  deleteCommunication,
  deleteTemplate,
  fetchCommunicationStats,
  fetchCommunications,
  fetchDeliverySummary,
  fetchRecipients,
  fetchTemplates,
  invokeSendCommunicationWorkflow,
  queueCommunication,
  readCommunicationPrefill,
  resolveRecipients,
  saveDraftCommunication,
  simulateSendCommunication,
  cancelScheduledCommunication,
  upsertTemplate,
  type DeliverySummary,
} from "../../services/communicationsService";
import { fetchEvents } from "../../services/stage2/eventsService";
import type {
  CommunicationChannel,
  CommunicationRecord,
  CommunicationRecipientRecord,
  CommunicationTargetType,
  CommunicationTemplateRecord,
  ChurchEventRecord,
} from "../../types";
import { SupabaseListFeedback } from "../common/SupabaseListFeedback";
import { ConfirmModal } from "../common/ConfirmModal";
import { GlassPanel } from "../stage2/Stage2Motion";

const NAVY = STAGE2_COLORS.navy;
const GOLD = STAGE2_COLORS.gold;

function tabFromSubmodule(sub: string | undefined): "compose" | "campaigns" | "recipients" | "templates" | "logs" {
  const s = (sub ?? "Compose").toLowerCase();
  if (s.includes("campaign")) return "campaigns";
  if (s.includes("recipient") && !s.includes("delivery")) return "recipients";
  if (s.includes("template")) return "templates";
  if (s.includes("delivery") || s.includes("log")) return "logs";
  return "compose";
}

function statusBadge(status: string) {
  switch (status) {
    case "draft":
      return "bg-slate-100 text-slate-800 border-slate-200";
    case "queued":
      return "bg-orange-50 text-orange-900 border-orange-300";
    case "sent":
      return "bg-emerald-50 text-emerald-900 border-emerald-300";
    case "failed":
      return "bg-red-50 text-red-900 border-red-300";
    case "cancelled":
      return "bg-zinc-100 text-zinc-700 border-zinc-300";
    default:
      return "bg-slate-50 text-slate-700";
  }
}

function deliveryBadge(s: string) {
  switch (s) {
    case "sent":
      return "text-emerald-700 bg-emerald-50";
    case "failed":
      return "text-red-700 bg-red-50";
    case "skipped":
      return "bg-amber-50 text-amber-900";
    default:
      return "bg-orange-50 text-orange-800";
  }
}

export function CommunicationsPanel(props: { submodule?: string; highlightRecordId?: string | null }) {
  const { reportError, pushToast, canPortalCreateModule, canPortalEditModule, canPortalDeleteModule } = usePortal();
  const canCreate = canPortalCreateModule("communications");
  const canEdit = canPortalEditModule("communications");
  const canDelete = canPortalDeleteModule("communications");

  const [tab, setTab] = useState(() => tabFromSubmodule(props.submodule));
  useEffect(() => {
    setTab(tabFromSubmodule(props.submodule));
  }, [props.submodule]);

  const [stats, setStats] = useState({
    total: 0,
    queued: 0,
    sent: 0,
    failed: 0,
    draft: 0,
    recipients: 0,
    smsCampaigns: 0,
    emailCampaigns: 0,
  });
  const [campaigns, setCampaigns] = useState<CommunicationRecord[]>([]);
  const [templates, setTemplates] = useState<CommunicationTemplateRecord[]>([]);
  const [events, setEvents] = useState<ChurchEventRecord[]>([]);
  const [roles, setRoles] = useState<{ role_key: string; label_sw: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [channel, setChannel] = useState<CommunicationChannel>("sms");
  const [targetType, setTargetType] = useState<CommunicationTargetType>("all");
  const [targetRole, setTargetRole] = useState("");
  const [targetGroup, setTargetGroup] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [targetPhone, setTargetPhone] = useState("");
  const [customRaw, setCustomRaw] = useState("");
  const [scheduleLocal, setScheduleLocal] = useState("");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [recipientRows, setRecipientRows] = useState<CommunicationRecipientRecord[]>([]);
  const [logsRows, setLogsRows] = useState<CommunicationRecipientRecord[]>([]);

  const [tplName, setTplName] = useState("");
  const [tplBody, setTplBody] = useState("");
  const [tplSubject, setTplSubject] = useState("");
  const [tplChannel, setTplChannel] = useState<CommunicationChannel>("sms");
  const [editingTpl, setEditingTpl] = useState<CommunicationTemplateRecord | null>(null);

  const [delCampaignId, setDelCampaignId] = useState<string | null>(null);
  const [delTplId, setDelTplId] = useState<string | null>(null);
  const [summaryById, setSummaryById] = useState<Record<string, DeliverySummary | null>>({});

  const smsUnits = useMemo(() => Math.max(1, Math.ceil(message.length / 160)), [message.length]);

  const loadAll = useCallback(async () => {
    if (!getSupabase()) {
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [st, list, tpl, ev, rRows] = await Promise.all([
        fetchCommunicationStats(),
        fetchCommunications(),
        fetchTemplates(),
        fetchEvents(),
        getSupabase()!
          .from("portal_roles")
          .select("role_key, label_sw")
          .order("hierarchy_rank", { ascending: true })
          .then(({ data, error }) => {
            if (error) throw error;
            return (data ?? []) as { role_key: string; label_sw: string }[];
          }),
      ]);
      setStats(st);
      setCampaigns(list);
      setTemplates(tpl);
      setEvents(ev);
      setRoles(rRows);
    } catch (e) {
      reportError(e, "Mawasiliano — pakua data");
      setLoadError(SUPABASE_QUERY_ERROR_SW);
      setCampaigns([]);
      setTemplates([]);
      setEvents([]);
      setRoles([]);
      setStats({
        total: 0,
        queued: 0,
        sent: 0,
        failed: 0,
        draft: 0,
        recipients: 0,
        smsCampaigns: 0,
        emailCampaigns: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [reportError]);

  const reloadWithMetrics = useCallback(async () => {
    await loadAll();
    dispatchPortalReloadMetrics();
  }, [loadAll]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!campaigns.length || !getSupabase()) return;
    let cancelled = false;
    void (async () => {
      const pairs = await Promise.all(
        campaigns.map(async (c) => {
          try {
            const s = await fetchDeliverySummary(c.id);
            return [c.id, s] as const;
          } catch (e) {
            reportError(e, "Mawasiliano — muhtasari wa utoaji");
            return [c.id, null] as const;
          }
        })
      );
      if (!cancelled) setSummaryById(Object.fromEntries(pairs));
    })();
    return () => {
      cancelled = true;
    };
  }, [campaigns, reportError]);

  useEffect(() => {
    if (!campaigns.length) return;
    setSelectedCampaignId((prev) => {
      if (prev && campaigns.some((c) => c.id === prev)) return prev;
      return campaigns[0].id;
    });
  }, [campaigns]);

  useEffect(() => {
    const pre = readCommunicationPrefill();
    if (pre) {
      if (pre.title) setTitle(String(pre.title));
      if (pre.message) setMessage(String(pre.message));
      if (pre.subject) setSubject(String(pre.subject));
      if (pre.channel) setChannel(pre.channel);
      if (pre.target_type) setTargetType(pre.target_type);
      if (pre.target_role != null) setTargetRole(pre.target_role ?? "");
      if (pre.target_group != null) setTargetGroup(pre.target_group ?? "");
      if (pre.target_email != null) setTargetEmail(pre.target_email ?? "");
      if (pre.target_phone != null) setTargetPhone(pre.target_phone ?? "");
      if (pre.scheduled_at) setScheduleLocal(pre.scheduled_at.slice(0, 16));
      clearCommunicationPrefill();
      setTab("compose");
      pushToast("Taarifa za ujumbe zimejazwa — hakiki na utume.", "info");
    }
  }, [pushToast]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!getSupabase()) return;
      setPreviewBusy(true);
      try {
        const rows = await resolveRecipients({
          channel,
          target_type: targetType,
          target_role: targetRole || null,
          target_group: targetGroup || null,
          target_email: targetEmail || null,
          target_phone: targetPhone || null,
          custom_recipients_raw: customRaw || null,
        });
        const deduped = dedupeRecipients(rows, channel);
        const usable = deduped.filter((r) => {
          const needE = channel === "email" || channel === "both";
          const needP = channel === "sms" || channel === "both";
          if (channel === "both") return !!(r.recipient_email || r.recipient_phone);
          if (needE && needP) return !!(r.recipient_email || r.recipient_phone);
          if (needE) return !!r.recipient_email;
          return !!r.recipient_phone;
        });
        if (!cancelled) setPreviewCount(usable.length);
      } catch (e) {
        if (!cancelled) {
          setPreviewCount(null);
          reportError(e, "Mawasiliano — hakiki wapokeaji");
        }
      } finally {
        if (!cancelled) setPreviewBusy(false);
      }
    };
    const t = window.setTimeout(() => void run(), 400);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [channel, targetType, targetRole, targetGroup, targetEmail, targetPhone, customRaw, reportError]);

  useEffect(() => {
    if (!selectedCampaignId || !getSupabase()) {
      setRecipientRows([]);
      return;
    }
    void fetchRecipients(selectedCampaignId)
      .then(setRecipientRows)
      .catch((e) => reportError(e, "Mawasiliano — wapokeaji"));
  }, [selectedCampaignId, reportError]);

  useEffect(() => {
    if (tab !== "logs" || !getSupabase()) return;
    void (async () => {
      try {
        const c = getSupabase()!;
        const { data, error } = await c
          .from("communication_recipients")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(250);
        if (error) throw error;
        setLogsRows((data ?? []) as unknown as CommunicationRecipientRecord[]);
      } catch (e) {
        reportError(e, "Mawasiliano — historia ya utoaji");
      }
    })();
  }, [tab, campaigns, reportError]);

  const onSaveDraft = async () => {
    if (!canCreate) return;
    if (!title.trim() || !message.trim()) {
      pushToast("Jina na ujumbe vinahitajika.", "error");
      return;
    }
    setSaving(true);
    try {
      await saveDraftCommunication({
        title,
        message,
        subject: subject || null,
        channel,
        target_type: targetType,
        target_role: targetRole || null,
        target_group: targetGroup || null,
        target_email: targetEmail || null,
        target_phone: targetPhone || null,
        custom_recipients_raw: customRaw || null,
        scheduled_at: scheduleLocal ? new Date(scheduleLocal).toISOString() : null,
      });
      pushToast("Ujumbe umehifadhiwa", "success");
      await reloadWithMetrics();
    } catch (e) {
      reportError(e, "Mawasiliano — hifadhi rasimu");
      pushToast("Imeshindikana kuhifadhi ujumbe.", "error");
    } finally {
      setSaving(false);
    }
  };

  const onQueue = async () => {
    if (!canCreate) return;
    if (!title.trim() || !message.trim()) {
      pushToast("Jina na ujumbe vinahitajika.", "error");
      return;
    }
    setSaving(true);
    try {
      const { communication, recipients } = await queueCommunication({
        title,
        message,
        subject: subject || null,
        channel,
        target_type: targetType,
        target_role: targetRole || null,
        target_group: targetGroup || null,
        target_email: targetEmail || null,
        target_phone: targetPhone || null,
        custom_recipients_raw: customRaw || null,
        scheduled_at: scheduleLocal ? new Date(scheduleLocal).toISOString() : null,
      });
      pushToast("Ujumbe umewekwa kwenye foleni", "success");
      setTitle("");
      setMessage("");
      setSubject("");
      setCustomRaw("");
      setScheduleLocal("");
      await reloadWithMetrics();
      pushToast(`Wapokeaji ${recipients}`, "info");
      const edge = await invokeSendCommunicationWorkflow(communication.id);
      if (!edge.ok) {
        reportError(new Error(edge.error ?? "Edge Function"), "Mawasiliano — utoaji wa seva");
        pushToast("Foleni imehifadhiwa; Edge Function haijapatikana au imeshindwa. Sanidi utoaji kwenye Supabase.", "info");
      } else {
        pushToast("Ujumbe unatumwa kupitia seva (SMS/barua pepe).", "success");
        await reloadWithMetrics();
      }
    } catch (e) {
      if (e instanceof Error && e.message === "NO_RECIPIENTS") {
        pushToast("Hakuna wapokeaji waliopatikana", "info");
      } else {
        reportError(e, "Mawasiliano — foleni");
        pushToast("Imeshindikana kutuma ujumbe", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const onSimulate = async (id: string) => {
    if (!canEdit) return;
    setSaving(true);
    try {
      await simulateSendCommunication(id);
      pushToast("Ujumbe umetumwa", "success");
      await reloadWithMetrics();
    } catch (e) {
      reportError(e, "Mawasiliano — mfano wa utoaji");
      pushToast("Imeshindikana kutuma ujumbe", "error");
    } finally {
      setSaving(false);
    }
  };

  const onSendNow = async (id: string) => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const res = await invokeSendCommunicationWorkflow(id);
      if (!res.ok) {
        reportError(new Error(res.error ?? "invoke"), "Mawasiliano — Tuma sasa");
        pushToast("Imeshindikana kuunganisha na Edge Function.", "error");
      } else {
        pushToast("Utumaji umefanywa.", "success");
        await reloadWithMetrics();
      }
    } catch (e) {
      reportError(e, "Mawasiliano — Tuma sasa");
      pushToast("Imeshindikana kutuma.", "error");
    } finally {
      setSaving(false);
    }
  };

  const onRetryFailed = async (id: string) => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const res = await invokeSendCommunicationWorkflow(id, { retryFailed: true });
      if (!res.ok) {
        reportError(new Error(res.error ?? "invoke"), "Mawasiliano — jaribu tena");
        pushToast("Imeshindikana kuunganisha na Edge Function.", "error");
      } else {
        pushToast("Jaribio la kutuma tena limeanza.", "success");
        await reloadWithMetrics();
      }
    } catch (e) {
      reportError(e, "Mawasiliano — jaribu tena");
    } finally {
      setSaving(false);
    }
  };

  const onCancel = async (id: string) => {
    if (!canEdit) return;
    setSaving(true);
    try {
      await cancelScheduledCommunication(id);
      pushToast("Ratiba imeghairiwa.", "info");
      await reloadWithMetrics();
    } catch (e) {
      reportError(e, "Mawasiliano — ghairi");
    } finally {
      setSaving(false);
    }
  };

  const onDeleteCampaign = async () => {
    if (!delCampaignId || !canDelete) return;
    setSaving(true);
    try {
      await deleteCommunication(delCampaignId);
      pushToast("Imefutwa.", "success");
      setDelCampaignId(null);
      await reloadWithMetrics();
    } catch (e) {
      reportError(e, "Mawasiliano — futa");
    } finally {
      setSaving(false);
    }
  };

  const saveTpl = async () => {
    if (!canCreate) return;
    if (!tplName.trim() || !tplBody.trim()) {
      pushToast("Jina na mwili vinahitajika.", "error");
      return;
    }
    setSaving(true);
    try {
      await upsertTemplate({
        id: editingTpl?.id,
        name: tplName,
        body: tplBody,
        subject: tplSubject || null,
        channel: tplChannel,
        is_active: true,
      });
      pushToast("Kiolezo kimehifadhiwa.", "success");
      setEditingTpl(null);
      setTplName("");
      setTplBody("");
      setTplSubject("");
      await reloadWithMetrics();
    } catch (e) {
      reportError(e, "Mawasiliano — kiolezo");
    } finally {
      setSaving(false);
    }
  };

  const removeTpl = async () => {
    if (!delTplId || !canDelete) return;
    setSaving(true);
    try {
      await deleteTemplate(delTplId);
      pushToast("Kimefutwa.", "success");
      setDelTplId(null);
      await reloadWithMetrics();
    } catch (e) {
      reportError(e, "Mawasiliano — futa kiolezo");
    } finally {
      setSaving(false);
    }
  };

  const applyTemplate = (t: CommunicationTemplateRecord) => {
    setMessage(String(t.body ?? ""));
    if (t.subject) setSubject(t.subject);
    setChannel(t.channel);
    pushToast(`Kiolezo "${t.name}" limepakuliwa.`, "success");
  };

  const tabs: { id: typeof tab; label: string; icon: typeof Megaphone }[] = [
    { id: "compose", label: "Andaa ujumbe", icon: Send },
    { id: "campaigns", label: "Kampeni", icon: Megaphone },
    { id: "recipients", label: "Wapokeaji", icon: Users },
    { id: "templates", label: "Violezo", icon: FileText },
    { id: "logs", label: "Historia ya utoaji", icon: Activity },
  ];

  return (
    <div className="space-y-4">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-[#123C69]/40 bg-gradient-to-r from-[#0B1F3A] via-[#0f2744] to-[#123C69] p-5 text-white shadow-xl"
      >
        <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-200">Mawasiliano / SMS &amp; Email</p>
            <h2 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-sm">Kituo cha mawasiliano</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-100">
              Tumia data halisi ya Supabase. Usitumie funguo za siri mwenyewe — utoaji halisi uko kwenye Edge Function.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabs.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setTab(x.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold shadow transition ${
                  tab === x.id ? "bg-[#D4AF37] text-[#0B1F3A] shadow-md" : "bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25"
                }`}
              >
                <x.icon className="h-4 w-4" />
                {x.label}
              </button>
            ))}
          </div>
        </div>
      </motion.section>

      <SupabaseListFeedback loading={loading} loadError={loadError} isEmpty={false} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Jumla ya kampeni", value: stats.total, icon: Megaphone, tone: "border-l-4 border-[#0B3C5D]" },
          { label: "Ziko foleni", value: stats.queued, icon: CalendarClock, tone: "border-l-4 border-orange-500" },
          { label: "Zimetumwa", value: stats.sent, icon: Send, tone: "border-l-4 border-emerald-600" },
          { label: "Zimeshindwa", value: stats.failed, icon: XCircle, tone: "border-l-4 border-red-600" },
          { label: "Rasimu", value: stats.draft, icon: FileText, tone: "border-l-4 border-slate-500" },
          { label: "Jumla ya wapokeaji", value: stats.recipients, icon: Users, tone: "border-l-4 border-[#D4AF37]" },
          { label: "Michakato ya SMS", value: stats.smsCampaigns, icon: Smartphone, tone: "border-l-4 border-sky-600" },
          { label: "Michakato ya barua pepe", value: stats.emailCampaigns, icon: Mail, tone: "border-l-4 border-indigo-600" },
        ].map((k) => (
          <motion.article
            key={k.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-md ${k.tone}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700">{k.label}</p>
              <k.icon className="h-4 w-4 text-slate-600" />
            </div>
            <p className="mt-2 text-2xl font-extrabold tabular-nums text-[#0B1F3A]">{loading ? "—" : k.value}</p>
          </motion.article>
        ))}
      </section>

      <AnimatePresence mode="wait">
        {tab === "compose" && (
          <motion.div key="compose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-4 xl:grid-cols-3">
            <GlassPanel className="xl:col-span-2 space-y-4 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Bell className="h-4 w-4" style={{ color: NAVY }} />
                <h3 className="text-lg font-bold text-[#0B1F3A]">Andaa ujumbe</h3>
              </div>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Kichwa</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-500"
                  placeholder="Kichwa cha kampeni"
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-700">Njia</span>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as CommunicationChannel)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  >
                    <option value="sms">SMS</option>
                    <option value="email">Barua pepe</option>
                    <option value="both">SMS + Barua pepe</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-700">Lengo</span>
                  <select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value as CommunicationTargetType)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  >
                    <option value="all">Watumiaji wote wa portal</option>
                    <option value="role">Kwa jukumu (role)</option>
                    <option value="members">Waumini (walio hai)</option>
                    <option value="group">Kundi / tawi (chujio)</option>
                    <option value="beneficiaries">Wanufaika wa misaada</option>
                    <option value="event_participants">Tukio (arifu waumini — chagua tukio)</option>
                    <option value="individual">Mtu mmoja (simu / barua)</option>
                    <option value="custom_list">Orodha maalum (nakala)</option>
                  </select>
                </label>
              </div>
              {(channel === "email" || channel === "both") && (
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-700">Mada (email)</span>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
                    placeholder="Mada ya barua pepe"
                  />
                </label>
              )}
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Ujumbe</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 font-mono text-sm"
                  placeholder="Andika ujumbe…"
                />
              </label>
              {(channel === "sms" || channel === "both") && (
                <p className="text-xs text-slate-600">
                  Herufi: {message.length} • Takriban sehemu za SMS: {smsUnits} / 160
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-700">Kiolezo</span>
                  <select
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 text-sm"
                    defaultValue=""
                    onChange={(e) => {
                      const t = templates.find((x) => x.id === e.target.value);
                      if (t) applyTemplate(t);
                    }}
                  >
                    <option value="">— Chagua kiolezo —</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {targetType === "role" && (
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-700">Jukumu</span>
                  <select value={targetRole} onChange={(e) => setTargetRole(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900">
                    <option value="">— Chagua —</option>
                    {roles.map((r) => (
                      <option key={r.role_key} value={r.role_key}>
                        {r.label_sw} ({r.role_key})
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {(targetType === "group" || targetType === "event_participants") && (
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-700">
                    {targetType === "group" ? "Chujio la tawi / kundi" : "Kitambulisho cha tukio (UUID)"}
                  </span>
                  {targetType === "event_participants" ? (
                    <select
                      value={targetGroup}
                      onChange={(e) => setTargetGroup(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
                    >
                      <option value="">— Chagua tukio —</option>
                      {events.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.title} — {ev.event_date}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={targetGroup}
                      onChange={(e) => setTargetGroup(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
                      placeholder="Mfano: Tawi la Amani"
                    />
                  )}
                </label>
              )}
              {targetType === "individual" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-slate-700">Barua pepe</span>
                    <input
                      value={targetEmail}
                      onChange={(e) => setTargetEmail(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
                      type="email"
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-slate-700">Simu</span>
                    <input
                      value={targetPhone}
                      onChange={(e) => setTargetPhone(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
                      placeholder=""
                    />
                  </label>
                </div>
              )}
              {targetType === "custom_list" && (
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-700">Weka nambari au barua (mstari mmoja kila moja au comma)</span>
                  <textarea
                    value={customRaw}
                    onChange={(e) => setCustomRaw(e.target.value)}
                    rows={4}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 font-mono text-xs"
                  />
                </label>
              )}
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Ratiba (si lazima — acha tupu kwa sasa)</span>
                <input
                  type="datetime-local"
                  value={scheduleLocal}
                  onChange={(e) => setScheduleLocal(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
                />
              </label>

              <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  disabled={saving || !canCreate}
                  onClick={() => void onSaveDraft()}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  Hifadhi rasimu
                </button>
                <button
                  type="button"
                  disabled={saving || !canCreate}
                  onClick={() => void onQueue()}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: NAVY }}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MousePointerClick className="h-4 w-4" />}
                  Weka kwenye foleni
                </button>
              </div>
            </GlassPanel>

            <GlassPanel className="space-y-4 p-5">
              <h4 className="flex items-center gap-2 font-bold text-slate-900">
                <Users className="h-4 w-4" style={{ color: GOLD }} />
                Hakiki wapokeaji
              </h4>
              <p className="text-sm text-slate-600">
                Idadi hii inakadiria kwa mipangilio ya sasa (data halisi kutoka kwenye jedwali).
              </p>
              <div className="rounded-2xl border border-dashed border-[#D4AF37]/50 bg-amber-50/40 p-6 text-center">
                {previewBusy ? (
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#0B3C5D]" />
                ) : (
                  <p className="text-4xl font-black text-[#0B3C5D]">{previewCount ?? "—"}</p>
                )}
                <p className="mt-2 text-xs font-medium text-slate-600">Wapokeaji walio tayari kwa njia uliyochagua</p>
              </div>
              <div className="rounded-xl bg-slate-900/90 p-3 text-xs text-slate-100">
                <p className="font-semibold text-amber-200">Kumbuka</p>
                <p className="mt-1 leading-relaxed">
                  Never send SMS/Email directly from frontend using secret keys. Utoaji halisi — tumia Edge Function{" "}
                  <code className="rounded bg-black/30 px-1">send-communication</code>.
                </p>
              </div>
            </GlassPanel>
          </motion.div>
        )}

        {tab === "campaigns" && (
          <motion.div key="campaigns" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <GlassPanel className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-100 text-slate-900">
                    <tr>
                      <th className="px-3 py-2">Kichwa</th>
                      <th className="px-3 py-2">Njia</th>
                      <th className="px-3 py-2">Hali</th>
                      <th className="px-3 py-2">Wapokeaji</th>
                      <th className="px-3 py-2">Muhtasari utoaji</th>
                      <th className="px-3 py-2">Tarehe</th>
                      <th className="px-3 py-2 text-right">Vitendo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-10 text-center text-slate-500">
                          Hakuna kampeni bado — unda kutoka kwa tab ya kuandaa.
                        </td>
                      </tr>
                    ) : (
                      campaigns.map((row) => {
                        const sm = summaryById[row.id];
                        const summaryText =
                          sm === undefined
                            ? "—"
                            : sm === null
                              ? SUPABASE_QUERY_ERROR_SW
                              : `Imetumwa ${sm.sent} • Imeshindwa ${sm.failed} • Inasubiri ${sm.pending} • Imepita ${sm.skipped}`;
                        return (
                          <tr key={row.id} className="border-t border-slate-100 hover:bg-amber-50/30">
                            <td className="px-3 py-2 font-medium text-slate-900">{row.title}</td>
                            <td className="px-3 py-2 uppercase">{row.channel}</td>
                            <td className="px-3 py-2">
                              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadge(row.status)}`}>
                                {row.status}
                              </span>
                            </td>
                            <td className="px-3 py-2">{row.recipients_count}</td>
                            <td className="max-w-[220px] px-3 py-2 text-xs text-slate-700" title={summaryText}>
                              {summaryText}
                            </td>
                            <td className="px-3 py-2 text-xs text-slate-600">{new Date(row.created_at).toLocaleString("sw-TZ")}</td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex flex-wrap justify-end gap-1">
                                {canEdit && row.status === "queued" && (
                                  <>
                                    <button
                                      type="button"
                                      className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                                      onClick={() => void onSendNow(row.id)}
                                    >
                                      Tuma sasa
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded-lg border border-orange-200 px-2 py-1 text-xs font-semibold text-orange-800 hover:bg-orange-50"
                                      onClick={() => void onSimulate(row.id)}
                                    >
                                      Mfano (dev)
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                                      onClick={() => void onCancel(row.id)}
                                    >
                                      Ghairi
                                    </button>
                                  </>
                                )}
                                {canEdit && row.status === "failed" && (
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-900 hover:bg-rose-100"
                                    onClick={() => void onRetryFailed(row.id)}
                                  >
                                    <RefreshCw className="h-3 w-3" />
                                    Jaribu tena
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    type="button"
                                    className="rounded-lg p-1 text-red-600 hover:bg-red-50"
                                    aria-label="Futa"
                                    onClick={() => setDelCampaignId(row.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </GlassPanel>
          </motion.div>
        )}

        {tab === "recipients" && (
          <motion.div key="recipients" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium text-slate-700">
                Kampeni:
                <select
                  value={selectedCampaignId ?? ""}
                  onChange={(e) => setSelectedCampaignId(e.target.value || null)}
                  className="ml-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
                >
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <GlassPanel className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-100 text-slate-900">
                    <tr>
                      <th className="px-3 py-2">Jina</th>
                      <th className="px-3 py-2">Barua</th>
                      <th className="px-3 py-2">Simu</th>
                      <th className="px-3 py-2">Aina</th>
                      <th className="px-3 py-2">Uwasilishaji</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipientRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-10 text-center text-slate-500">
                          Hakuna wapokeaji kwa kampeni hii.
                        </td>
                      </tr>
                    ) : (
                      recipientRows.map((r) => (
                        <tr key={r.id} className="border-t border-slate-100">
                          <td className="px-3 py-2">{r.recipient_name ?? "—"}</td>
                          <td className="px-3 py-2">{r.recipient_email ?? "—"}</td>
                          <td className="px-3 py-2">{r.recipient_phone ?? "—"}</td>
                          <td className="px-3 py-2 text-xs">{r.recipient_type ?? "—"}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${deliveryBadge(r.delivery_status)}`}>
                              {r.delivery_status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </GlassPanel>
          </motion.div>
        )}

        {tab === "templates" && (
          <motion.div key="templates" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4 xl:grid-cols-2">
            <GlassPanel className="space-y-3 p-5">
              <h3 className="font-bold text-slate-900">Violezo vilivyopo</h3>
              <ul className="space-y-2">
                {templates.length === 0 ? (
                  <li className="text-sm text-slate-500">Hakuna kiolezo — unda upya.</li>
                ) : (
                  templates.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-start justify-between gap-2 rounded-xl border border-slate-100 bg-white/80 px-3 py-2"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{t.name}</p>
                        <p className="text-xs text-slate-500 line-clamp-2">{t.body}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                          onClick={() => {
                            setEditingTpl(t);
                            setTplName(t.name);
                            setTplBody(t.body);
                            setTplSubject(t.subject ?? "");
                            setTplChannel(t.channel);
                          }}
                        >
                          Hariri
                        </button>
                        {canDelete && (
                          <button type="button" className="text-red-600" onClick={() => setDelTplId(t.id)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </GlassPanel>
            <GlassPanel className="space-y-3 p-5">
              <h3 className="font-bold text-slate-900">{editingTpl ? "Hariri kiolezo" : "Kiolezo kipya"}</h3>
              <label className="grid gap-1 text-sm">
                Jina
                <input value={tplName} onChange={(e) => setTplName(e.target.value)} className="rounded-xl border px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm">
                Njia
                <select value={tplChannel} onChange={(e) => setTplChannel(e.target.value as CommunicationChannel)} className="rounded-xl border px-3 py-2">
                  <option value="sms">SMS</option>
                  <option value="email">Barua pepe</option>
                  <option value="both">Vyote</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Mada (si lazima)
                <input value={tplSubject} onChange={(e) => setTplSubject(e.target.value)} className="rounded-xl border px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm">
                Mwili
                <textarea value={tplBody} onChange={(e) => setTplBody(e.target.value)} rows={5} className="rounded-xl border px-3 py-2 font-mono text-sm" />
              </label>
              <button
                type="button"
                disabled={saving || !canCreate}
                onClick={() => void saveTpl()}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: NAVY }}
              >
                Hifadhi kiolezo
              </button>
            </GlassPanel>
          </motion.div>
        )}

        {tab === "logs" && (
          <motion.div key="logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GlassPanel className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-100 text-slate-900">
                    <tr>
                      <th className="px-3 py-2">Kitambulisho cha ujumbe</th>
                      <th className="px-3 py-2">Jina</th>
                      <th className="px-3 py-2">Barua / Simu</th>
                      <th className="px-3 py-2">Hali</th>
                      <th className="px-3 py-2">Kitambulisho cha mtoa huduma</th>
                      <th className="px-3 py-2">Kosa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-10 text-center text-slate-500">
                          Hakuna historia bado.
                        </td>
                      </tr>
                    ) : (
                      logsRows.map((r) => (
                        <tr key={r.id} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-mono text-xs">{r.communication_id.slice(0, 8)}…</td>
                          <td className="px-3 py-2">{r.recipient_name ?? "—"}</td>
                          <td className="px-3 py-2 text-xs">
                            {r.recipient_email ?? "—"} / {r.recipient_phone ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${deliveryBadge(r.delivery_status)}`}>
                              {r.delivery_status}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{r.provider_message_id ?? "—"}</td>
                          <td className="px-3 py-2 text-xs text-red-700">{r.error_message ?? "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={!!delCampaignId}
        title="Futa kampeni?"
        message="Rekodi za wapokeaji zitafutwa pamoja."
        onCancel={() => setDelCampaignId(null)}
        onConfirm={() => void onDeleteCampaign()}
        confirmLoading={saving}
      />
      <ConfirmModal
        open={!!delTplId}
        title="Futa kiolezo?"
        message="Hatua hii haiwezi kutenduliwa kwa urahisi."
        onCancel={() => setDelTplId(null)}
        onConfirm={() => void removeTpl()}
        confirmLoading={saving}
      />
    </div>
  );
}
