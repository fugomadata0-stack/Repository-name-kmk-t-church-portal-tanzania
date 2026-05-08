import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Gift,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
  UserPlus,
  XCircle,
} from "lucide-react";
import { ModalScrollLayer } from "../common/ModalScrollLayer";
import { usePortal } from "../../context/PortalContext";
import { getSupabase } from "../../lib/supabaseClient";
import { safeArray, safeLower } from "../../lib/safe";
import { STAGE2_COLORS, stage2GradHeader } from "../../lib/stage2Theme";
import {
  deleteAidBeneficiary,
  deleteAidRequest,
  fetchAidBeneficiaries,
  fetchAidRequestsJoined,
  normalizeAidRequestRow,
  upsertAidBeneficiary,
  upsertAidDisbursement,
  upsertAidRequest,
} from "../../services/aidManagementService";
import {
  notifyAidApproved,
  notifyAidDelivered,
  notifyAidInReview,
  notifyAidRejected,
  notifyAidSubmitted,
} from "../../services/aidWorkflowNotifications";
import { queueBeneficiaryApprovalSms, queueFinanceDisbursementNotice } from "../../services/communicationsService";
import type {
  AidBeneficiaryRow,
  AidDeliveryMethod,
  AidDisbursementRow,
  AidGroupCategory,
  AidRequestJoinedRow,
  AidRequestRow,
  AidTypeKey,
  AidUrgencyLevel,
  AidWorkflowStatus,
} from "../../types";
import { ConfirmModal } from "../common/ConfirmModal";
import { GlassPanel, MotionCard } from "../stage2/Stage2Motion";
import { parseAidSubmodule } from "../../lib/aidSubmodule";

const GROUP_OPTIONS: AidGroupCategory[] = [
  "Wazee",
  "Wajane",
  "Yatima",
  "Walemavu",
  "Watoto",
  "Vijana",
  "Wagonjwa",
  "Familia zenye uhitaji",
  "Wengine",
];

const AID_TYPES: { key: AidTypeKey; label: string }[] = [
  { key: "cash", label: "Fedha (cash)" },
  { key: "food", label: "Chakula" },
  { key: "medical", label: "Matibabu" },
  { key: "education", label: "Elimu" },
  { key: "clothes", label: "Nguo" },
  { key: "shelter", label: "Makazi" },
  { key: "other", label: "Nyingine" },
];

const URGENCY_OPTS: { key: AidUrgencyLevel; label: string }[] = [
  { key: "low", label: "Chini" },
  { key: "medium", label: "Wastani" },
  { key: "high", label: "Juu" },
  { key: "emergency", label: "Dharura" },
];

const DELIVERY_OPTS: { key: AidDeliveryMethod; label: string }[] = [
  { key: "cash", label: "Fedha taslimu" },
  { key: "mobile_money", label: "Simu / Mobile money" },
  { key: "bank", label: "Benki" },
  { key: "physical_items", label: "Vitu halisi" },
];

function parseItems(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  return [];
}

function itemsToText(items: unknown): string {
  return parseItems(items).join("\n");
}

function statusBadgeClass(s: AidWorkflowStatus): string {
  switch (s) {
    case "draft":
      return "bg-slate-100 text-slate-800 border-slate-200";
    case "submitted":
      return "bg-sky-100 text-sky-900 border-sky-300";
    case "review":
      return "bg-orange-100 text-orange-900 border-orange-300";
    case "approved":
      return "bg-emerald-100 text-emerald-900 border-emerald-300";
    case "rejected":
      return "bg-red-100 text-red-900 border-red-300";
    case "completed":
      return "bg-green-100 text-green-900 border-green-300";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function statusLabelSw(s: AidWorkflowStatus): string {
  const m: Record<AidWorkflowStatus, string> = {
    draft: "Rasimu",
    submitted: "Limeshawasilishwa",
    review: "Ukaguzi",
    approved: "Limeidhinishwa",
    rejected: "Limekataliwa",
    completed: "Limekamilishwa",
  };
  return m[s] ?? s;
}

function friendlyMonth(ym: string): string {
  const [y, m] = ym.split("-").map((x) => parseInt(x, 10));
  if (!y || !m) return ym;
  const d = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat("sw-TZ", { month: "long", year: "numeric" }).format(d);
}

function SignaturePad({ onChange }: { value?: string; onChange: (dataUrl: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const pos = (e: React.MouseEvent | React.TouchEvent) => {
    const c = ref.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    if ("touches" in e && e.touches[0]) {
      return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
    }
    const me = e as React.MouseEvent;
    return { x: me.clientX - r.left, y: me.clientY - r.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    drawing.current = true;
    const { x, y } = pos(e);
    const c = ref.current?.getContext("2d");
    if (!c) return;
    c.strokeStyle = "#0B3C5D";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    const { x, y } = pos(e);
    const c = ref.current?.getContext("2d");
    if (!c) return;
    c.lineTo(x, y);
    c.stroke();
    if (ref.current) onChange(ref.current.toDataURL("image/png"));
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = () => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    onChange("");
  };

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
  }, []);

  return (
    <div className="space-y-2">
      <canvas
        ref={ref}
        width={320}
        height={120}
        className="w-full max-w-md touch-none rounded-xl border-2 border-[#0B3C5D]/30 bg-white"
        onMouseDown={start}
        onMouseMove={draw}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={draw}
        onTouchEnd={end}
      />
      <button type="button" onClick={clear} className="text-xs text-slate-600 underline">
        Futa saini
      </button>
    </div>
  );
}

function emptyBeneficiary(): Partial<AidBeneficiaryRow> {
  return {
    full_name: "",
    gender: "",
    phone: "",
    address: "",
    group_category: "Wengine",
    special_condition: "",
    notes: "",
  };
}

function emptyRequest(beneficiaryId: string): Partial<AidRequestRow> {
  const today = new Date().toISOString().slice(0, 10);
  return {
    beneficiary_id: beneficiaryId,
    aid_type: "other",
    description: "",
    amount: 0,
    items: [],
    urgency_level: "medium",
    request_date: today,
    status: "draft",
    reviewed_by: "",
    review_notes: "",
    review_date: null,
    approved_by: "",
    approved_signature: "",
    approval_notes: "",
    approved_at: null,
    approval_status: "pending",
    completed_at: null,
  };
}

export function AidManagementPanel(props: { highlightRecordId?: string | null; submodule?: string }) {
  const { reportError, pushToast, canPortalCreateModule, canPortalEditModule, canPortalDeleteModule, canPortalExportModule } =
    usePortal();
  const canCreate = canPortalCreateModule("aid_management");
  const canEdit = canPortalEditModule("aid_management");
  const canDelete = canPortalDeleteModule("aid_management");
  const canExport = canPortalExportModule("aid_management");

  const [rows, setRows] = useState<AidRequestJoinedRow[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<AidBeneficiaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState<string>("ALL");
  const [catFilter, setCatFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("ALL");

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [ben, setBen] = useState<Partial<AidBeneficiaryRow>>(emptyBeneficiary());
  const [req, setReq] = useState<Partial<AidRequestRow>>(emptyRequest(""));
  const [dis, setDis] = useState<Partial<AidDisbursementRow>>({
    delivered_by: "",
    delivered_at: null,
    delivery_method: "physical_items",
    delivery_reference: "",
    delivery_notes: "",
    recipient_confirmation: "",
    amount_delivered: null,
    completed_at: null,
  });
  const [itemsText, setItemsText] = useState("");
  const [existingBenId, setExistingBenId] = useState<string | null>(null);
  const [delReqId, setDelReqId] = useState<string | null>(null);
  const [delBenId, setDelBenId] = useState<string | null>(null);
  const [delBusy, setDelBusy] = useState(false);

  const section = useMemo(() => parseAidSubmodule(props.submodule), [props.submodule]);

  useEffect(() => {
    if (section === "vibali") setStatusFilter("review");
    else if (section === "utoaji") setStatusFilter("approved");
    else setStatusFilter("ALL");
  }, [section]);

  const load = useCallback(async () => {
    if (!getSupabase()) {
      setRows([]);
      setBeneficiaries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [rlist, blist] = await Promise.all([fetchAidRequestsJoined(), fetchAidBeneficiaries()]);
      setRows(rlist.map((x) => normalizeAidRequestRow(x)));
      setBeneficiaries(blist);
    } catch (e) {
      reportError(e, "Misaada — orodha");
      setRows([]);
      setBeneficiaries([]);
    } finally {
      setLoading(false);
    }
  }, [reportError]);

  useEffect(() => {
    void load();
  }, [load]);

  const monthOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      if (r.request_month) s.add(r.request_month);
      else if (r.request_date) {
        const rd = String(r.request_date);
        if (rd.length >= 7) s.add(rd.slice(0, 7));
      }
    });
    return ["ALL", ...Array.from(s).sort().reverse()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = safeLower(search).trim();
    return safeArray(rows).filter((r) => {
      const b = Array.isArray(r.aid_beneficiaries) ? r.aid_beneficiaries[0] : r.aid_beneficiaries;
      const name = safeLower(b?.full_name);
      const phone = safeLower(b?.phone);
      if (q && !name.includes(q) && !phone.includes(q)) return false;
      if (monthFilter !== "ALL") {
        const ym = r.request_month ?? r.request_date?.slice(0, 7);
        if (ym !== monthFilter) return false;
      }
      if (catFilter !== "ALL" && b?.group_category !== catFilter) return false;
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && r.aid_type !== typeFilter) return false;
      if (urgencyFilter !== "ALL" && r.urgency_level !== urgencyFilter) return false;
      return true;
    });
  }, [rows, search, monthFilter, catFilter, statusFilter, typeFilter, urgencyFilter]);

  const analytics = useMemo(() => {
    const pool = monthFilter === "ALL" ? filtered : filtered.filter((r) => (r.request_month ?? r.request_date?.slice(0, 7)) === monthFilter);
    const pending = pool.filter((r) => ["draft", "submitted", "review"].includes(r.status)).length;
    const approvedMonth = pool.filter((r) => r.status === "approved").length;
    const completedMonth = pool.filter((r) => r.status === "completed").length;
    const emergency = pool.filter((r) => r.urgency_level === "emergency").length;
    let approvedAmt = 0;
    let deliveredAmt = 0;
    pool.forEach((r) => {
      if (r.approval_status === "approved" || r.status === "approved" || r.status === "completed") {
        approvedAmt += Number(r.amount ?? 0);
      }
      const d = Array.isArray(r.aid_disbursements) ? r.aid_disbursements[0] : r.aid_disbursements;
      if (d?.amount_delivered != null) deliveredAmt += Number(d.amount_delivered);
      else if (r.status === "completed") deliveredAmt += Number(r.amount ?? 0);
    });
    return {
      total: pool.length,
      pending,
      approvedMonth,
      completedMonth,
      approvedAmt,
      deliveredAmt,
      emergency,
    };
  }, [filtered, monthFilter]);

  const openCreate = () => {
    setBen(emptyBeneficiary());
    setReq(emptyRequest(""));
    setDis({
      delivered_by: "",
      delivered_at: null,
      delivery_method: "physical_items",
      delivery_reference: "",
      delivery_notes: "",
      recipient_confirmation: "",
      amount_delivered: null,
      completed_at: null,
    });
    setItemsText("");
    setExistingBenId(null);
    setWizardStep(0);
    setWizardOpen(true);
  };

  const openEdit = (r: AidRequestJoinedRow) => {
    const b = Array.isArray(r.aid_beneficiaries) ? r.aid_beneficiaries[0] : r.aid_beneficiaries;
    const d = Array.isArray(r.aid_disbursements) ? r.aid_disbursements[0] : r.aid_disbursements;
    if (b) setBen({ ...b });
    setReq({ ...r, items: parseItems(r.items) });
    setItemsText(itemsToText(r.items));
    setExistingBenId(b?.id ?? null);
    if (d) {
      setDis({ ...d });
    } else {
      setDis({
        request_id: r.id,
        delivered_by: "",
        delivered_at: null,
        delivery_method: "physical_items",
        delivery_reference: "",
        delivery_notes: "",
        recipient_confirmation: "",
        amount_delivered: r.amount ?? null,
        completed_at: null,
      });
    }
    setWizardStep(0);
    setWizardOpen(true);
  };

  const persistCore = async (): Promise<{ beneficiaryId: string; requestId: string } | null> => {
    if (!getSupabase()) return null;
    const fn = ben.full_name?.trim();
    if (!fn) {
      pushToast("Jina kamili la mwanufaika linahitajika.", "error");
      return null;
    }
    const savedBen = await upsertAidBeneficiary({
      ...ben,
      id: existingBenId ?? ben.id,
      full_name: fn,
    } as AidBeneficiaryRow);
    const bid = savedBen.id;
    const itemsArr = itemsText
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
    const savedReq = await upsertAidRequest({
      ...req,
      id: req.id,
      beneficiary_id: bid,
      items: itemsArr,
      amount: Number(req.amount ?? 0),
      request_date: (req.request_date ?? new Date().toISOString().slice(0, 10)).slice(0, 10),
    } as AidRequestRow);
    return { beneficiaryId: bid, requestId: savedReq.id };
  };

  const saveDraft = async () => {
    if (!canCreate && !canEdit) return;
    setSaving(true);
    try {
      const ids = await persistCore();
      if (!ids) return;
      pushToast("Ombi limehifadhiwa.", "success");
      await load();
      setReq((r) => ({ ...r, id: ids.requestId }));
      setExistingBenId(ids.beneficiaryId);
    } catch (e) {
      reportError(e, "Misaada — hifadhi");
      pushToast("Imeshindikana kuhifadhi ombi.", "error");
    } finally {
      setSaving(false);
    }
  };

  const submitRequest = async () => {
    if (!canCreate && !canEdit) return;
    setSaving(true);
    try {
      const ids = await persistCore();
      if (!ids) return;
      const itemsArr = itemsText.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
      await upsertAidRequest({
        ...req,
        id: ids.requestId,
        beneficiary_id: ids.beneficiaryId,
        status: "submitted",
        aid_type: (req.aid_type as AidTypeKey) ?? "other",
        description: req.description ?? "",
        amount: Number(req.amount ?? 0),
        items: itemsArr,
        urgency_level: (req.urgency_level as AidUrgencyLevel) ?? "medium",
        request_date: (req.request_date ?? new Date().toISOString().slice(0, 10)).slice(0, 10),
      } as AidRequestRow);
      const name = ben.full_name?.trim() ?? "";
      await notifyAidSubmitted({ beneficiaryName: name });
      pushToast("Ombi limehifadhiwa.", "success");
      setWizardOpen(false);
      await load();
    } catch (e) {
      reportError(e, "Misaada — wasilisho");
      pushToast("Imeshindikana kuhifadhi ombi.", "error");
    } finally {
      setSaving(false);
    }
  };

  const moveToReview = async () => {
    if (!canEdit || !req.id) return;
    setSaving(true);
    try {
      await upsertAidRequest({
        ...req,
        id: req.id,
        beneficiary_id: req.beneficiary_id!,
        status: "review",
        reviewed_by: req.reviewed_by,
        review_notes: req.review_notes,
        review_date: req.review_date,
      } as AidRequestRow);
      await notifyAidInReview({ beneficiaryName: ben.full_name?.trim() ?? "—" });
      pushToast("Ombi limehamishwa kwenye ukaguzi.", "success");
      setWizardOpen(false);
      await load();
    } catch (e) {
      reportError(e, "Misaada — ukaguzi");
      pushToast("Imeshindikana kuhifadhi ombi.", "error");
    } finally {
      setSaving(false);
    }
  };

  const approveReq = async () => {
    if (!canEdit || !req.id) return;
    setSaving(true);
    try {
      await upsertAidRequest({
        ...req,
        id: req.id,
        beneficiary_id: req.beneficiary_id!,
        status: "approved",
        approval_status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: req.approved_by ?? "",
        approved_signature: req.approved_signature ?? "",
        approval_notes: req.approval_notes ?? "",
      } as AidRequestRow);
      await notifyAidApproved({ beneficiaryName: ben.full_name?.trim() ?? "—" });
      await queueBeneficiaryApprovalSms({
        beneficiaryName: ben.full_name?.trim() ?? "—",
        phone: ben.phone ?? null,
      });
      pushToast("Ombi limeidhinishwa.", "success");
      setWizardOpen(false);
      await load();
    } catch (e) {
      reportError(e, "Misaada — idhini");
      pushToast("Imeshindikana kuhifadhi ombi.", "error");
    } finally {
      setSaving(false);
    }
  };

  const rejectReq = async () => {
    if (!canEdit || !req.id) return;
    setSaving(true);
    try {
      await upsertAidRequest({
        ...req,
        id: req.id,
        beneficiary_id: req.beneficiary_id!,
        status: "rejected",
        approval_status: "rejected",
      } as AidRequestRow);
      await notifyAidRejected({
        beneficiaryName: ben.full_name?.trim() ?? "—",
        creatorUserId: req.created_by ?? null,
      });
      pushToast("Ombi limekataliwa.", "info");
      setWizardOpen(false);
      await load();
    } catch (e) {
      reportError(e, "Misaada — kukataliwa");
      pushToast("Imeshindikana kuhifadhi ombi.", "error");
    } finally {
      setSaving(false);
    }
  };

  const deliverReq = async () => {
    if (!canEdit || !req.id) return;
    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      await upsertAidRequest({
        ...req,
        id: req.id,
        beneficiary_id: req.beneficiary_id!,
        status: "completed",
        completed_at: nowIso,
      } as AidRequestRow);
      await upsertAidDisbursement({
        ...dis,
        id: dis.id,
        request_id: req.id,
        delivered_at: dis.delivered_at ?? nowIso,
        completed_at: nowIso,
        amount_delivered: dis.amount_delivered ?? Number(req.amount ?? 0),
      } as AidDisbursementRow);
      await notifyAidDelivered({
        beneficiaryName: ben.full_name?.trim() ?? "—",
        creatorUserId: req.created_by ?? null,
      });
      await queueFinanceDisbursementNotice({
        beneficiaryName: ben.full_name?.trim() ?? "—",
        amountLabel: `${Number(req.amount ?? 0).toLocaleString("sw-TZ")} TZS`,
      });
      pushToast("Msaada umetolewa.", "success");
      setWizardOpen(false);
      await load();
    } catch (e) {
      reportError(e, "Misaada — utoaji");
      pushToast("Imeshindikana kuhifadhi ombi.", "error");
    } finally {
      setSaving(false);
    }
  };

  const removeRequest = async () => {
    if (!delReqId) return;
    setDelBusy(true);
    try {
      await deleteAidRequest(delReqId);
      pushToast("Ombi limefutwa.", "success");
      setDelReqId(null);
      await load();
    } catch (e) {
      reportError(e, "Misaada — futa");
      pushToast("Imeshindikana kufuta.", "error");
    } finally {
      setDelBusy(false);
    }
  };

  const removeBeneficiary = async () => {
    if (!delBenId) return;
    setDelBusy(true);
    try {
      await deleteAidBeneficiary(delBenId);
      pushToast("Mwanufaika amefutwa.", "success");
      setDelBenId(null);
      await load();
    } catch (e) {
      reportError(e, "Misaada — futa mwanufaika");
      pushToast("Huwezi kufuta (kunaweza kuwa na maombi yanayohusiana).", "error");
    } finally {
      setDelBusy(false);
    }
  };

  const exportCsv = () => {
    if (!canExport) return;
    const header = ["Jina", "Simu", "Kundi", "Aina", "Dharura", "Hali", "Kiasi", "Mwezi"];
    const lines = [
      header.join(","),
      ...filtered.map((r) => {
        const b = Array.isArray(r.aid_beneficiaries) ? r.aid_beneficiaries[0] : r.aid_beneficiaries;
        const cells = [
          `"${(b?.full_name ?? "").replace(/"/g, '""')}"`,
          `"${(b?.phone ?? "").replace(/"/g, '""')}"`,
          `"${(b?.group_category ?? "").replace(/"/g, '""')}"`,
          r.aid_type,
          r.urgency_level,
          r.status,
          String(r.amount ?? 0),
          r.request_month ?? "",
        ];
        return cells.join(",");
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `misaada_kanisa_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    if (!canExport) return;
    const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const autoTable = autoTableMod.default;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Ripoti ya Misaada ya Kanisa", 14, 16);
    doc.setFontSize(10);
    doc.text(`Tarehe: ${new Date().toLocaleString("sw-TZ")}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [["Jina", "Simu", "Kundi", "Aina ya msaada", "Dharura", "Hali", "Kiasi (TZS)", "Mwezi"]],
      body: filtered.map((r) => {
        const b = Array.isArray(r.aid_beneficiaries) ? r.aid_beneficiaries[0] : r.aid_beneficiaries;
        return [
          b?.full_name ?? "",
          b?.phone ?? "",
          b?.group_category ?? "",
          r.aid_type,
          r.urgency_level,
          statusLabelSw(r.status),
          String(r.amount ?? 0),
          r.request_month ?? "",
        ];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [11, 60, 93] },
    });
    doc.save(`misaada_kanisa_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const printForm = () => {
    window.print();
  };

  const stepTitles = ["Mwanufaika", "Maelezo ya ombi", "Ukaguzi", "Idhini", "Utoaji"];

  const goNext = () => setWizardStep((s) => Math.min(4, s + 1));
  const goPrev = () => setWizardStep((s) => Math.max(0, s - 1));

  const highlightId = props.highlightRecordId;

  return (
    <div className="space-y-6 print:space-y-3">
      <div className={`rounded-2xl px-4 py-5 text-white shadow-lg print:hidden ${stage2GradHeader}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/80">Aid workflow</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">Misaada ya Kanisa</h2>
            <p className="mt-1 max-w-2xl text-sm text-white/90">
              Beneficiary → Request → Review → Approval → Delivery → Report. Data hai kutoka Supabase.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canCreate && (
              <button
                type="button"
                onClick={() => openCreate()}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/25"
              >
                <Plus className="h-4 w-4" />
                Ombi jipya
              </button>
            )}
            {canExport && (
              <>
                <button
                  type="button"
                  onClick={() => exportCsv()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-3 py-2 text-sm hover:bg-white/10"
                >
                  <Download className="h-4 w-4" />
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() => exportPdf()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-3 py-2 text-sm hover:bg-white/10"
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => printForm()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-3 py-2 text-sm hover:bg-white/10"
                >
                  <Printer className="h-4 w-4" />
                  Chapisha
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 print:hidden" role="tablist" aria-label="Sehemu za misaada">
        {[
          ["Maombi & Workflow", "Maombi"],
          ["Wanufaika", "Wanufaika"],
          ["Vibali & Uhakiki", "Vibali"],
          ["Utoaji", "Utoaji"],
          ["Ripoti & Chuja", "Ripoti"],
        ].map(([sub, label]) => (
          <button
            key={sub}
            type="button"
            role="tab"
            aria-selected={(props.submodule ?? "").trim() === sub}
            className={`rounded-xl px-3 py-2 text-xs font-semibold ring-1 transition ${
              (props.submodule ?? "").trim() === sub
                ? "bg-[#0B3C5D] text-white ring-[#0B3C5D]"
                : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50"
            }`}
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("kmt-portal-navigate", { detail: { moduleKey: "aid_management", submodule: sub } })
              )
            }
          >
            {label}
          </button>
        ))}
      </div>

      {section === "vibali" ? (
        <p className="text-xs text-slate-600 print:hidden" role="note">
          Ukaguzi: rekodi zenye hali &ldquo;Ukaguzi&rdquo; au angalia pia &ldquo;Limeshawasilishwa&rdquo; kwa dropdown ya Hali.
        </p>
      ) : null}
      {section === "utoaji" ? (
        <p className="text-xs text-slate-600 print:hidden" role="note">
          Utoaji: chagua rekodi zilizoidhinishwa ili kukamilisha malipo / utoaji.
        </p>
      ) : null}
      {section === "ripoti" ? (
        <p className="text-xs text-amber-900 print:hidden" role="note">
          Ripoti: tumia CSV / PDF juu au chuja chini kisha hamisha.
        </p>
      ) : null}

      <div className="grid gap-3 print:hidden sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[
          { label: "Jumla ya maombi", value: analytics.total, icon: ClipboardList, tone: "border-l-4 border-[#0B3C5D]" },
          { label: "Yanasubiri", value: analytics.pending, icon: AlertTriangle, tone: "border-l-4 border-orange-500" },
          { label: "Idhinishwa (kipindi)", value: analytics.approvedMonth, icon: ShieldCheck, tone: "border-l-4 border-emerald-600" },
          { label: "Yamekamilisha (kipindi)", value: analytics.completedMonth, icon: CheckCircle2, tone: "border-l-4 border-green-600" },
          { label: "Jumla ya kiasi kilichoidhinishwa", value: analytics.approvedAmt.toLocaleString("sw-TZ") + " TZS", icon: Gift, tone: "border-l-4 border-[#D4AF37]" },
          { label: "Jumla ya kilichotolewa", value: analytics.deliveredAmt.toLocaleString("sw-TZ") + " TZS", icon: Truck, tone: "border-l-4 border-teal-600" },
          { label: "Kesi za dharura", value: analytics.emergency, icon: AlertTriangle, tone: "border-l-4 border-red-600" },
        ].map((card) => (
          <MotionCard key={card.label} className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-md ${card.tone}`}>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#0B3C5D]/10 text-[#0B3C5D]">
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-700">{card.label}</p>
                <p className="text-lg font-bold tabular-nums text-[#0B1F3A]">{card.value}</p>
              </div>
            </div>
          </MotionCard>
        ))}
      </div>

      <GlassPanel className="p-4 print:hidden">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-slate-600">Tafuta jina / simu</span>
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500"
                placeholder="Andika..."
              />
            </span>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="flex items-center gap-1 text-slate-600">
              <Calendar className="h-4 w-4" /> Mwezi
            </span>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m === "ALL" ? "Wote" : friendlyMonth(m)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Kundi</span>
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="ALL">Zote</option>
              {GROUP_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Hali</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="ALL">Zote</option>
              {(["draft", "submitted", "review", "approved", "rejected", "completed"] as AidWorkflowStatus[]).map((s) => (
                <option key={s} value={s}>
                  {statusLabelSw(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Aina ya msaada</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="ALL">Zote</option>
              {AID_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Dharura</span>
            <select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)} className="rounded-xl border px-3 py-2 text-sm">
              <option value="ALL">Zote</option>
              {URGENCY_OPTS.map((u) => (
                <option key={u.key} value={u.key}>
                  {u.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </GlassPanel>

      <GlassPanel className="overflow-hidden print:border-0 print:shadow-none">
        <div className="hidden print:block print:p-4">
          <h1 className="text-xl font-bold text-[#0B3C5D]">Orodha ya maombi ya misaada</h1>
          <p className="text-sm text-slate-600">
            {monthFilter === "ALL" ? "Mwezi wote" : friendlyMonth(monthFilter)} — {filtered.length} rekodi
          </p>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 p-8 text-slate-600" role="status" aria-live="polite" aria-busy="true">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Inapakia…
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-slate-600">Hakuna rekodi zinazolingana na vigezo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-800 print:bg-white">
                <tr>
                  <th className="border-b px-3 py-2">Mwanufaika</th>
                  <th className="border-b px-3 py-2">Simu</th>
                  <th className="border-b px-3 py-2">Kundi</th>
                  <th className="border-b px-3 py-2">Msaada</th>
                  <th className="border-b px-3 py-2">Dharura</th>
                  <th className="border-b px-3 py-2">Hali</th>
                  <th className="border-b px-3 py-2">Kiasi</th>
                  <th className="border-b px-3 py-2 print:hidden">Vitendo</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const b = Array.isArray(r.aid_beneficiaries) ? r.aid_beneficiaries[0] : r.aid_beneficiaries;
                  const hl = highlightId === r.id ? "bg-amber-50/80" : "";
                  return (
                    <tr key={r.id} className={`border-b border-slate-100 hover:bg-slate-50/80 dark:border-slate-700 ${hl}`}>
                      <td className="px-3 py-2 font-medium text-slate-800">{b?.full_name ?? "—"}</td>
                      <td className="px-3 py-2">{b?.phone ?? "—"}</td>
                      <td className="px-3 py-2">{b?.group_category ?? "—"}</td>
                      <td className="px-3 py-2">{AID_TYPES.find((x) => x.key === r.aid_type)?.label ?? r.aid_type}</td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            r.urgency_level === "emergency"
                              ? "rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800"
                              : "text-slate-700"
                          }
                        >
                          {URGENCY_OPTS.find((u) => u.key === r.urgency_level)?.label ?? r.urgency_level}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(r.status)}`}>
                          {statusLabelSw(r.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2">{Number(r.amount ?? 0).toLocaleString("sw-TZ")}</td>
                      <td className="px-3 py-2 print:hidden">
                        <div className="flex flex-wrap gap-1">
                          <button type="button" onClick={() => openEdit(r)} className="rounded-lg border border-slate-200 p-1.5 hover:bg-white" title="Hariri">
                            <Pencil className="h-4 w-4 text-[#0B3C5D]" />
                          </button>
                          {canDelete && (
                            <button type="button" onClick={() => setDelReqId(r.id)} className="rounded-lg border border-rose-200 p-1.5 hover:bg-rose-50" title="Futa">
                              <Trash2 className="h-4 w-4 text-rose-700" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassPanel>

      <GlassPanel className="p-4 print:hidden">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-semibold text-[#0B1F3A]">Wanufaika (haraka)</h3>
          {canCreate && (
            <button
              type="button"
              onClick={() => {
                setBen(emptyBeneficiary());
                setExistingBenId(null);
                setReq(emptyRequest(""));
                setWizardStep(0);
                setWizardOpen(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-[#0B3C5D]/30 px-3 py-1.5 text-xs font-semibold text-[#0B3C5D] hover:bg-[#0B3C5D]/5"
            >
              <UserPlus className="h-4 w-4" />
              Ongeza mwanufaika
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {beneficiaries.slice(0, 24).map((x) => (
            <span key={x.id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs dark:border-slate-600 dark:bg-slate-900">
              {x.full_name}
              {canDelete && (
                <button type="button" className="text-rose-600 hover:underline" onClick={() => setDelBenId(x.id)} title="Futa">
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      </GlassPanel>

      <AnimatePresence>
        {wizardOpen && (
          <ModalScrollLayer
            key="aid-wizard"
            onBackdropClick={() => setWizardOpen(false)}
            maxWidthClass="max-w-3xl"
            overlayClassName="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-black/50 px-4 py-10 backdrop-blur-sm print:hidden"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="w-full rounded-2xl border border-white/40 bg-[#FDFBF7] p-5 shadow-2xl dark:bg-slate-900"
            >
              <div className="mb-4 flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Wizard</p>
                  <h3 className="text-xl font-bold text-[#0B3C5D]">{stepTitles[wizardStep]}</h3>
                </div>
                <button type="button" className="rounded-lg p-2 hover:bg-black/5" onClick={() => setWizardOpen(false)} aria-label="Funga">
                  <XCircle className="h-6 w-6 text-slate-600" />
                </button>
              </div>

              <div className="mb-6 flex gap-1">
                {stepTitles.map((t, i) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setWizardStep(i)}
                    className={`flex-1 rounded-lg px-2 py-2 text-center text-[10px] font-semibold sm:text-xs ${
                      i === wizardStep ? "bg-[#0B3C5D] text-white" : i < wizardStep ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {i + 1}. {t}
                  </button>
                ))}
              </div>

              {wizardStep === 0 && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Chagua mwanufaika aliyepo
                    <select
                      className="mt-1 w-full rounded-xl border px-3 py-2"
                      value={existingBenId ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setExistingBenId(v || null);
                        if (v) {
                          const found = beneficiaries.find((b) => b.id === v);
                          if (found) setBen({ ...found });
                          setReq((r) => ({ ...r, beneficiary_id: v }));
                        }
                      }}
                    >
                      <option value="">— Mpya au chagua —</option>
                      {beneficiaries.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.full_name} ({b.phone})
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm">
                      Jina kamili *
                      <input
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                        value={ben.full_name ?? ""}
                        onChange={(e) => setBen({ ...ben, full_name: e.target.value })}
                      />
                    </label>
                    <label className="text-sm">
                      Jinsia
                      <select
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                        value={ben.gender ?? ""}
                        onChange={(e) => setBen({ ...ben, gender: e.target.value as AidBeneficiaryRow["gender"] })}
                      >
                        <option value="">—</option>
                        <option value="male">Mwanaume</option>
                        <option value="female">Mwanamke</option>
                        <option value="other">Nyingine</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      Simu
                      <input
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                        value={ben.phone ?? ""}
                        onChange={(e) => setBen({ ...ben, phone: e.target.value })}
                      />
                    </label>
                    <label className="text-sm">
                      Kundi
                      <select
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                        value={ben.group_category ?? "Wengine"}
                        onChange={(e) => setBen({ ...ben, group_category: e.target.value as AidGroupCategory })}
                      >
                        {GROUP_OPTIONS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="text-sm">
                    Anwani
                    <textarea className="mt-1 w-full rounded-xl border px-3 py-2" rows={2} value={ben.address ?? ""} onChange={(e) => setBen({ ...ben, address: e.target.value })} />
                  </label>
                  <label className="text-sm">
                    Hali maalum / ulemavu
                    <input className="mt-1 w-full rounded-xl border px-3 py-2" value={ben.special_condition ?? ""} onChange={(e) => setBen({ ...ben, special_condition: e.target.value })} />
                  </label>
                  <label className="text-sm">
                    Maelezo mengine
                    <textarea className="mt-1 w-full rounded-xl border px-3 py-2" rows={2} value={ben.notes ?? ""} onChange={(e) => setBen({ ...ben, notes: e.target.value })} />
                  </label>
                </div>
              )}

              {wizardStep === 1 && (
                <div className="space-y-3">
                  <label className="text-sm">
                    Aina ya msaada
                    <select
                      className="mt-1 w-full rounded-xl border px-3 py-2"
                      value={req.aid_type ?? "other"}
                      onChange={(e) => setReq({ ...req, aid_type: e.target.value as AidTypeKey })}
                    >
                      {AID_TYPES.map((t) => (
                        <option key={t.key} value={t.key}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    Maelezo
                    <textarea className="mt-1 w-full rounded-xl border px-3 py-2" rows={3} value={req.description ?? ""} onChange={(e) => setReq({ ...req, description: e.target.value })} />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm">
                      Kiasi (TZS)
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                        value={req.amount ?? 0}
                        onChange={(e) => setReq({ ...req, amount: Number(e.target.value) })}
                      />
                    </label>
                    <label className="text-sm">
                      Kiwango cha dharura
                      <select
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                        value={req.urgency_level ?? "medium"}
                        onChange={(e) => setReq({ ...req, urgency_level: e.target.value as AidUrgencyLevel })}
                      >
                        {URGENCY_OPTS.map((u) => (
                          <option key={u.key} value={u.key}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      Tarehe ya ombi
                      <input
                        type="date"
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                        value={(req.request_date ?? new Date().toISOString().slice(0, 10)).slice(0, 10)}
                        onChange={(e) => setReq({ ...req, request_date: e.target.value })}
                      />
                    </label>
                    <label className="text-sm">
                      Mwezi (kiotomatiki)
                      <input
                        readOnly
                        className="mt-1 w-full rounded-xl border bg-slate-50 px-3 py-2"
                        value={friendlyMonth((req.request_date ?? new Date().toISOString().slice(0, 10)).slice(0, 7))}
                      />
                    </label>
                  </div>
                  <label className="text-sm">
                    Orodha ya vitu (mstari mmoja kwa kila kitu)
                    <textarea className="mt-1 w-full rounded-xl border px-3 py-2 font-mono text-xs" rows={4} value={itemsText} onChange={(e) => setItemsText(e.target.value)} />
                  </label>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-3">
                  <label className="text-sm">
                    Hali ya kazi
                    <select
                      className="mt-1 w-full rounded-xl border px-3 py-2"
                      value={req.status ?? "draft"}
                      onChange={(e) => setReq({ ...req, status: e.target.value as AidWorkflowStatus })}
                    >
                      <option value="draft">Rasimu</option>
                      <option value="submitted">Limeshawasilishwa</option>
                      <option value="review">Ukaguzi</option>
                      <option value="approved">Limeidhinishwa</option>
                      <option value="rejected">Limekataliwa</option>
                      <option value="completed">Limekamilishwa</option>
                    </select>
                  </label>
                  <label className="text-sm">
                    Aliyeangalia
                    <input className="mt-1 w-full rounded-xl border px-3 py-2" value={req.reviewed_by ?? ""} onChange={(e) => setReq({ ...req, reviewed_by: e.target.value })} />
                  </label>
                  <label className="text-sm">
                    Maelezo ya ukaguzi
                    <textarea className="mt-1 w-full rounded-xl border px-3 py-2" rows={3} value={req.review_notes ?? ""} onChange={(e) => setReq({ ...req, review_notes: e.target.value })} />
                  </label>
                  <label className="text-sm">
                    Tarehe ya ukaguzi
                    <input
                      type="date"
                      className="mt-1 w-full rounded-xl border px-3 py-2"
                      value={req.review_date?.slice(0, 10) ?? ""}
                      onChange={(e) => setReq({ ...req, review_date: e.target.value || null })}
                    />
                  </label>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#D4AF37]/40 bg-white/80 p-4">
                    <p className="text-sm font-bold text-[#0B3C5D]">Idhini ya kiutawala</p>
                    <label className="mt-2 block text-sm">
                      Imeidhinishwa na
                      <input className="mt-1 w-full rounded-xl border px-3 py-2" value={req.approved_by ?? ""} onChange={(e) => setReq({ ...req, approved_by: e.target.value })} />
                    </label>
                    <label className="mt-2 block text-sm">
                      Saini
                      <SignaturePad value={req.approved_signature ?? ""} onChange={(sig) => setReq({ ...req, approved_signature: sig })} />
                    </label>
                    <label className="mt-2 block text-sm">
                      Tarehe ya idhini
                      <input
                        type="datetime-local"
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                        value={req.approved_at ? req.approved_at.slice(0, 16) : ""}
                        onChange={(e) => setReq({ ...req, approved_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      />
                    </label>
                    <label className="mt-2 block text-sm">
                      Maelezo ya idhini
                      <textarea className="mt-1 w-full rounded-xl border px-3 py-2" rows={2} value={req.approval_notes ?? ""} onChange={(e) => setReq({ ...req, approval_notes: e.target.value })} />
                    </label>
                    <label className="mt-2 block text-sm">
                      Hali ya idhini
                      <select
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                        value={req.approval_status ?? "pending"}
                        onChange={(e) => setReq({ ...req, approval_status: e.target.value as AidRequestRow["approval_status"] })}
                      >
                        <option value="pending">Inasubiri</option>
                        <option value="approved">Imeidhinishwa</option>
                        <option value="rejected">Imekataliwa</option>
                      </select>
                    </label>
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="space-y-3">
                  <label className="text-sm">
                    Njia ya utoaji
                    <select
                      className="mt-1 w-full rounded-xl border px-3 py-2"
                      value={dis.delivery_method ?? "physical_items"}
                      onChange={(e) => setDis({ ...dis, delivery_method: e.target.value as AidDeliveryMethod })}
                    >
                      {DELIVERY_OPTS.map((d) => (
                        <option key={d.key} value={d.key}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    Aliyetoa msaada
                    <input className="mt-1 w-full rounded-xl border px-3 py-2" value={dis.delivered_by ?? ""} onChange={(e) => setDis({ ...dis, delivered_by: e.target.value })} />
                  </label>
                  <label className="text-sm">
                    Tarehe / saa ya utoaji
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded-xl border px-3 py-2"
                      value={dis.delivered_at ? dis.delivered_at.slice(0, 16) : ""}
                      onChange={(e) => setDis({ ...dis, delivered_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    />
                  </label>
                  <label className="text-sm">
                    Rejea / risiti
                    <input className="mt-1 w-full rounded-xl border px-3 py-2" value={dis.delivery_reference ?? ""} onChange={(e) => setDis({ ...dis, delivery_reference: e.target.value })} />
                  </label>
                  <label className="text-sm">
                    Maelezo ya utoaji
                    <textarea className="mt-1 w-full rounded-xl border px-3 py-2" rows={2} value={dis.delivery_notes ?? ""} onChange={(e) => setDis({ ...dis, delivery_notes: e.target.value })} />
                  </label>
                  <label className="text-sm">
                    Kiasi kilichotolewa (TZS)
                    <input
                      type="number"
                      className="mt-1 w-full rounded-xl border px-3 py-2"
                      value={dis.amount_delivered ?? ""}
                      onChange={(e) => setDis({ ...dis, amount_delivered: e.target.value === "" ? null : Number(e.target.value) })}
                    />
                  </label>
                  <label className="text-sm">
                    Uthibitisho wa mpokeaji
                    <input
                      className="mt-1 w-full rounded-xl border px-3 py-2"
                      value={dis.recipient_confirmation ?? ""}
                      onChange={(e) => setDis({ ...dis, recipient_confirmation: e.target.value })}
                      placeholder="Jina la mpokeaji / sahihi fupi"
                    />
                  </label>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4">
                <div className="flex gap-2">
                  <button type="button" disabled={wizardStep === 0} onClick={goPrev} className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm disabled:opacity-40">
                    <ArrowLeft className="h-4 w-4" />
                    Nyuma
                  </button>
                  <button type="button" disabled={wizardStep === 4} onClick={goNext} className="inline-flex items-center gap-1 rounded-xl border border-[#0B3C5D] px-3 py-2 text-sm text-[#0B3C5D] disabled:opacity-40">
                    Mbele
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(canCreate || canEdit) && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void saveDraft()}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hifadhi rasimu"}
                    </button>
                  )}
                  {(canCreate || canEdit) && wizardStep >= 1 && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void submitRequest()}
                      className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
                    >
                      Wasilisha ombi
                    </button>
                  )}
                  {canEdit && req.id && ["submitted", "draft"].includes(req.status ?? "") && (
                    <button type="button" disabled={saving} onClick={() => void moveToReview()} className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white">
                      Tuma ukaguzini
                    </button>
                  )}
                  {canEdit && req.id && req.status === "review" && (
                    <>
                      <button type="button" disabled={saving} onClick={() => void approveReq()} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                        Idhinisha
                      </button>
                      <button type="button" disabled={saving} onClick={() => void rejectReq()} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">
                        Kataa
                      </button>
                    </>
                  )}
                  {canEdit && req.id && req.status === "approved" && (
                    <button type="button" disabled={saving} onClick={() => void deliverReq()} className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: STAGE2_COLORS.navy }}>
                      Thibitisha utoaji / kamilisha
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </ModalScrollLayer>
        )}
      </AnimatePresence>

      <ConfirmModal open={!!delReqId} title="Futa ombi?" message="Hatua hii haiwezi kutenduliwa." onCancel={() => setDelReqId(null)} onConfirm={() => void removeRequest()} confirmLoading={delBusy} />
      <ConfirmModal open={!!delBenId} title="Futa mwanufaika?" message="Futa tu ikiwa hakuna maombi yanayohusiana." onCancel={() => setDelBenId(null)} onConfirm={() => void removeBeneficiary()} confirmLoading={delBusy} />
    </div>
  );
}
