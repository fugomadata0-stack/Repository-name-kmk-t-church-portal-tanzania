import { useEffect, useMemo, useState } from "react";
import { BarChart3, BookOpen, Copy, DollarSign, FileText, Lock, Plus, Printer, ShieldAlert, ShieldCheck, UserRoundCog, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AttendanceItems, OfferingItems, RoleName, WorshipServiceRecord } from "../types";
import {
  calculateAttendanceTotals,
  calculateNewBalance,
  calculateOfferingTotals,
  createWorshipRecord,
  deleteWorshipRecord,
  duplicateWorshipRecord,
  generateWhatsAppSummary,
  getWorshipDataSource,
  getWorshipRecords,
  updateWorshipRecord,
  validateRecord,
} from "../services/worshipServices";

type NewWorshipRecord = Omit<WorshipServiceRecord, "id">;

const tabs = [
  "Fomu ya Ibada",
  "Mahudhurio",
  "Sadaka na Matoleo",
  "Approval Workflow",
  "Weekly Reports",
  "Monthly Reports",
  "Yearly Reports",
  "Charts & Analytics",
  "WhatsApp Summary Generator",
  "Printable A4 Official Form",
  "PDF Export Center",
  "Historical Archive",
  "Attachments & Evidence",
  "Audit Trail / Change Logs",
  "Rekodi za Ibada",
];
const roles: RoleName[] = ["Super Admin", "Bishop", "Pastor", "Treasurer", "Secretary", "Branch Leader"];

const kpis = [
  { t: "Mahudhurio ya Leo", v: "569", s: "Ibada ya leo", tr: "+4.2%", i: Users, g: "from-blue-700 to-blue-500" },
  { t: "Mahudhurio ya Wiki", v: "930", s: "Wiki hii", tr: "+8.0%", i: BookOpen, g: "from-slate-900 to-blue-800" },
  { t: "Mahudhurio ya Mwezi", v: "3,560", s: "Mwezi huu", tr: "+6.1%", i: BarChart3, g: "from-amber-700 to-yellow-500" },
  { t: "Jumla ya Sadaka Leo", v: "TSh 2,406,000", s: "Cash + Mobile", tr: "+5.8%", i: DollarSign, g: "from-emerald-700 to-emerald-500" },
  { t: "Jumla ya Sadaka Wiki", v: "TSh 4,100,000", s: "Weekly flow", tr: "+4.4%", i: FileText, g: "from-purple-700 to-violet-500" },
  { t: "Jumla ya Sadaka Mwezi", v: "TSh 15,400,000", s: "Monthly flow", tr: "+9.2%", i: ShieldCheck, g: "from-red-700 to-rose-500" },
  { t: "Salio la Sasa", v: "TSh 3,126,000", s: "After matumizi", tr: "+2.7%", i: Lock, g: "from-teal-700 to-cyan-500" },
  { t: "Ibada Zilizorekodiwa", v: "2", s: "Current module", tr: "+1", i: BookOpen, g: "from-orange-700 to-orange-500" },
];

const chartData = [
  { name: "W1", attendance: 220, offering: 1200000 },
  { name: "W2", attendance: 260, offering: 1450000 },
  { name: "W3", attendance: 280, offering: 1590000 },
  { name: "W4", attendance: 240, offering: 1330000 },
];

const anomalyAlerts = [
  "Finance variance detected: TSh -928,000",
  "Reconciliation mismatch > 50,000 (Channels: TSh 1,478,000 vs Categories: TSh 2,406,000)",
];

const attendanceLabels: Record<keyof AttendanceItems, string> = {
  wakubwa: "Wakubwa",
  watoto: "Watoto",
  wageniMe: "Wageni Me",
  wageniKe: "Wageni Ke",
  waliotubu: "Waliotubu",
  waliookoka: "Waliookoka",
  waliobatizwa: "Waliobatizwa",
};

const offeringLabels: Record<keyof OfferingItems, string> = {
  sadaka: "Sadaka",
  zaka: "Zaka",
  matoleo: "Matoleo",
  fedhaTaslimu: "Fedha Taslimu",
  fedhaSimuBank: "Fedha kwa Simu / Bank",
  matumizi: "Matumizi",
  salioLilipita: "Salio Lililopita",
};

export function WorshipAttendanceOfferingModule() {
  const [tab, setTab] = useState(tabs[0]);
  const [role, setRole] = useState<RoleName>("Secretary");
  const [records, setRecords] = useState<WorshipServiceRecord[]>([]);
  const [search, setSearch] = useState("");
  const [attendance, setAttendance] = useState<AttendanceItems>({ wakubwa: 180, watoto: 74, wageniMe: 21, wageniKe: 27, waliotubu: 9, waliookoka: 6, waliobatizwa: 2 });
  const [offering, setOffering] = useState<OfferingItems>({ sadaka: 580000, zaka: 310000, matoleo: 140000, fedhaTaslimu: 720000, fedhaSimuBank: 758000, matumizi: 430000, salioLilipita: 1150000 });
  const [copied, setCopied] = useState(false);
  const [approvalFilter, setApprovalFilter] = useState("All");
  const [serviceFilter, setServiceFilter] = useState("All");
  const [creatorFilter, setCreatorFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [lockedRecordIds, setLockedRecordIds] = useState<number[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [dataSource, setDataSource] = useState<"supabase" | "local">("local");
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [loadError, setLoadError] = useState("");

  const refreshConnectionStatus = async () => {
    try {
      const source = await getWorshipDataSource();
      setDataSource(source);
      setNote(source === "supabase" ? "Supabase imeunganishwa." : "Inatumia local fallback.");
    } catch {
      setDataSource("local");
      setLoadError("Imeshindikana ku-check connection. Inaendelea na local fallback.");
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoadingRecords(true);
      setLoadError("");
      try {
        const [loadedRecords, source] = await Promise.all([getWorshipRecords(), getWorshipDataSource()]);
        setRecords(loadedRecords);
        setDataSource(source);
      } catch {
        setLoadError("Imeshindikana kupakia records kutoka source kuu. Tafadhali bofya Refresh au jaribu tena.");
      } finally {
        setLoadingRecords(false);
      }
    };
    void init();
  }, []);
  const attendanceTotals = useMemo(() => calculateAttendanceTotals(attendance), [attendance]);
  const offeringTotal = useMemo(() => calculateOfferingTotals(offering), [offering]);
  const newBalance = useMemo(() => calculateNewBalance(offering), [offering]);
  const validation = useMemo(() => validateRecord(attendance, offering), [attendance, offering]);
  const filteredRecords = records.filter((r) => {
    const bySearch = [r.tarehe, r.tawi, r.jimbo, r.dayosisi, r.ainaYaIbada].join(" ").toLowerCase().includes(search.toLowerCase());
    const byApproval = approvalFilter === "All" || r.approvalStatus === approvalFilter;
    const byService = serviceFilter === "All" || r.ainaYaIbada === serviceFilter;
    const byCreator = creatorFilter === "All" || r.createdBy === creatorFilter;
    const byStart = !startDate || r.tarehe >= startDate;
    const byEnd = !endDate || r.tarehe <= endDate;
    return bySearch && byApproval && byService && byCreator && byStart && byEnd;
  });
  const selectedRecord = useMemo(() => records.find((r) => r.id === selectedRecordId) ?? records[0], [records, selectedRecordId]);
  const waText = selectedRecord ? generateWhatsAppSummary(selectedRecord) : "No record selected";
  const summaryMetrics = useMemo(() => {
    const services = records.length;
    const totalAttendance = records.reduce((sum, r) => sum + r.jumlaMahudhurio, 0);
    const totalOfferings = records.reduce((sum, r) => sum + r.jumlaMapato, 0);
    const totalBalance = records.reduce((sum, r) => sum + r.salioJipya, 0);
    const avgAttendance = services ? Math.round(totalAttendance / services) : 0;
    const latest = records[0];
    return { services, totalAttendance, totalOfferings, totalBalance, avgAttendance, latest };
  }, [records]);

  const weeklyRows = useMemo(() => {
    if (!records.length) return [];
    return [
      {
        wiki: "W17",
        ibada: summaryMetrics.services,
        mahudhurio: summaryMetrics.totalAttendance,
        avg: summaryMetrics.avgAttendance,
        sadaka: summaryMetrics.totalOfferings,
        matumizi: offering.matumizi,
        net: summaryMetrics.totalBalance,
        growth: "+8%",
      },
    ];
  }, [records, summaryMetrics, offering.matumizi]);

  const monthlyRows = useMemo(() => {
    if (!records.length) return [];
    return [
      {
        mwezi: "Apr 2026",
        ibada: summaryMetrics.services,
        mahudhurio: summaryMetrics.totalAttendance,
        avg: summaryMetrics.avgAttendance,
        offerings: summaryMetrics.totalOfferings,
        expenses: offering.matumizi,
        net: summaryMetrics.totalBalance,
        best: summaryMetrics.latest?.ainaYaIbada ?? "N/A",
      },
    ];
  }, [records, summaryMetrics, offering.matumizi]);

  const yearlyRows = useMemo(() => {
    if (!records.length) return [];
    return [
      {
        mwaka: "2026",
        ibada: summaryMetrics.services,
        mahudhurio: summaryMetrics.totalAttendance,
        offerings: summaryMetrics.totalOfferings,
        expenses: offering.matumizi,
        closing: summaryMetrics.totalBalance,
        trend: "+12%",
      },
    ];
  }, [records, summaryMetrics, offering.matumizi]);

  const can = (action: string) => role === "Super Admin" || (role === "Secretary" && ["add", "edit", "view"].includes(action)) || (role === "Treasurer" && ["view", "verify"].includes(action)) || (role === "Pastor" && ["view", "approve"].includes(action)) || (role === "Bishop" && ["view", "review"].includes(action)) || (role === "Branch Leader" && ["view", "add"].includes(action));
  const serviceOptions = useMemo(() => Array.from(new Set(records.map((r) => r.ainaYaIbada))), [records]);
  const creatorOptions = useMemo(() => Array.from(new Set(records.map((r) => r.createdBy))), [records]);
  const approvalOptions = useMemo(() => Array.from(new Set(records.map((r) => r.approvalStatus))), [records]);
  const analyticsData = useMemo(
    () =>
      records.slice(0, 8).map((r, idx) => ({
        name: `R${idx + 1}`,
        attendance: r.jumlaMahudhurio,
        offering: r.jumlaMapato,
      })),
    [records],
  );
  const approvalSteps = useMemo(
    () => [
      { label: "Imeandaliwa na", actor: "Secretary", status: "Reviewed" },
      { label: "Imehakikiwa na", actor: "Treasurer", status: selectedRecord?.approvalStatus.includes("Treasurer") ? "Verified" : "Pending" },
      { label: "Imeidhinishwa na Mchungaji", actor: "Pastor", status: selectedRecord?.approvalStatus.includes("Pastor") ? "Approved" : "Pending" },
      { label: "Bishop review optional", actor: "Regional Bishop", status: selectedRecord?.approvalStatus.includes("Bishop") ? "Reviewed" : "Optional" },
    ],
    [selectedRecord],
  );
  const setNote = (note: string) => {
    setStatusNote(note);
    setTimeout(() => setStatusNote(""), 1800);
  };

  const handleDelete = async (id: number) => {
    setBusy(true);
    await deleteWorshipRecord(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setBusy(false);
    setNote("Record imefutwa.");
  };
  const handleDuplicate = async (record: WorshipServiceRecord) => {
    setBusy(true);
    const duplicated = await duplicateWorshipRecord(record);
    const withUpdateTime: WorshipServiceRecord = { ...duplicated, lastUpdated: new Date().toISOString().slice(0, 16).replace("T", " ") };
    const payload: NewWorshipRecord = {
      tarehe: withUpdateTime.tarehe,
      dayosisi: withUpdateTime.dayosisi,
      jimbo: withUpdateTime.jimbo,
      tawi: withUpdateTime.tawi,
      ainaYaIbada: withUpdateTime.ainaYaIbada,
      ibada1: withUpdateTime.ibada1,
      ibada2: withUpdateTime.ibada2,
      jumlaMahudhurio: withUpdateTime.jumlaMahudhurio,
      jumlaMapato: withUpdateTime.jumlaMapato,
      salioJipya: withUpdateTime.salioJipya,
      mhubiri: withUpdateTime.mhubiri,
      approvalStatus: withUpdateTime.approvalStatus,
      createdBy: withUpdateTime.createdBy,
      lastUpdated: withUpdateTime.lastUpdated,
    };
    const created = await createWorshipRecord(payload);
    setRecords((prev) => [created, ...prev]);
    setBusy(false);
    setNote("Record imeduplicate.");
  };
  const handleToggleLock = async (record: WorshipServiceRecord) => {
    const isLocked = lockedRecordIds.includes(record.id);
    const nextStatus = isLocked ? "Draft" : "Locked";
    setBusy(true);
    await updateWorshipRecord({ ...record, approvalStatus: nextStatus, lastUpdated: new Date().toISOString().slice(0, 16).replace("T", " ") });
    setLockedRecordIds((prev) => (isLocked ? prev.filter((x) => x !== record.id) : [...prev, record.id]));
    setRecords((prev) => prev.map((r) => (r.id === record.id ? { ...r, approvalStatus: nextStatus } : r)));
    setBusy(false);
    setNote(isLocked ? "Record imefunguliwa." : "Record imefungwa.");
  };
  const handleAddRecord = async () => {
    const nextId = records.reduce((max, r) => Math.max(max, r.id), 0) + 1;
    const now = new Date().toISOString().slice(0, 16).replace("T", " ");
    const template: WorshipServiceRecord = {
      id: nextId,
      tarehe: new Date().toISOString().slice(0, 10),
      dayosisi: "Kaskazini",
      jimbo: "Nkuyu",
      tawi: "Tawi Jipya",
      ainaYaIbada: "Jumapili Asubuhi",
      ibada1: attendance.wakubwa,
      ibada2: attendance.watoto,
      jumlaMahudhurio: attendanceTotals.total,
      jumlaMapato: offeringTotal,
      salioJipya: newBalance,
      mhubiri: "Mch. Daudi",
      approvalStatus: "Draft",
      createdBy: role,
      lastUpdated: now,
    };
    setBusy(true);
    const payload: NewWorshipRecord = {
      tarehe: template.tarehe,
      dayosisi: template.dayosisi,
      jimbo: template.jimbo,
      tawi: template.tawi,
      ainaYaIbada: template.ainaYaIbada,
      ibada1: template.ibada1,
      ibada2: template.ibada2,
      jumlaMahudhurio: template.jumlaMahudhurio,
      jumlaMapato: template.jumlaMapato,
      salioJipya: template.salioJipya,
      mhubiri: template.mhubiri,
      approvalStatus: template.approvalStatus,
      createdBy: template.createdBy,
      lastUpdated: template.lastUpdated,
    };
    const created = await createWorshipRecord(payload);
    setRecords((prev) => [created, ...prev]);
    setBusy(false);
    setNote("Record mpya imeongezwa.");
  };
  const exportText = () => {
    const blob = new Blob([waText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kmt-summary-${selectedRecord?.tarehe ?? "today"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const resetRecordFilters = () => {
    setSearch("");
    setApprovalFilter("All");
    setServiceFilter("All");
    setCreatorFilter("All");
    setStartDate("");
    setEndDate("");
    setNote("Filters zimereset.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f9f3e8] to-[#f2f6ff] p-4 text-slate-900">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <header className="rounded-2xl border border-blue-200 bg-white/95 p-4 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h1 className="text-2xl font-bold text-blue-900">Mahudhurio ya Ibada na Sadaka</h1><p className="text-sm text-slate-600">Rekodi, fuatilia, chapisha na chambua mahudhurio ya ibada pamoja na sadaka, zaka na mapato mengine kwa ubora wa hali ya juu.</p></div>
            <div className="flex items-center gap-2"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by tarehe, Tawi, Jimbo..." className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm" /><span className={`rounded-full px-3 py-1 text-xs font-bold ${dataSource === "supabase" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{dataSource === "supabase" ? "Supabase Connected" : "Local Fallback"}</span><button onClick={refreshConnectionStatus} className="rounded-lg border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-800">Refresh</button><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-900">{role}</span><UserRoundCog className="h-4 w-4 text-blue-700" /><select value={role} onChange={(e) => setRole(e.target.value as RoleName)} className="rounded-lg border border-blue-200 px-2 py-1 text-sm">{roles.map((r) => <option key={r}>{r}</option>)}</select></div>
          </div>
        </header>

        <section className="rounded-2xl border border-blue-200 bg-gradient-to-r from-[#081f53] via-[#1e56c0] to-blue-500 p-5 text-white shadow-xl">
          <div className="rounded-full bg-white/20 px-3 py-1 text-xs inline-block">“For with God nothing shall be impossible.” — Luke 1:37</div>
          <h2 className="mt-2 text-3xl font-bold">Mahudhurio ya Ibada na Sadaka</h2>
          <p className="text-sm text-blue-100">Official national-level mfumo wa KMT kwa attendance, offerings, approvals, analytics na printable church forms.</p>
          <div className="mt-3 grid gap-2 md:grid-cols-3"><div className="rounded-xl border border-white/40 bg-white/10 p-3">Jesus image area</div><div className="rounded-xl border border-white/40 bg-white/10 p-3">Bible image area</div><div className="rounded-xl border border-white/40 bg-white/10 p-3">Church building image area</div></div>
          <div className="mt-3 flex flex-wrap gap-2"><button onClick={handleAddRecord} disabled={!can("add") || busy} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-blue-900 disabled:opacity-50"><Plus className="mr-1 inline h-4 w-4" /> Ongeza Rekodi</button><button onClick={() => window.print()} className="rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm"><Printer className="mr-1 inline h-4 w-4" /> Print Preview</button><button onClick={() => window.print()} className="rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm"><FileText className="mr-1 inline h-4 w-4" /> Export PDF</button><button onClick={() => setTab("WhatsApp Summary Generator")} className="rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm">WhatsApp Summary</button></div>
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => { const I = k.i; return <article key={k.t} className={`rounded-2xl bg-gradient-to-br ${k.g} p-4 text-white shadow-lg`}><div className="flex justify-between text-xs"><span>{k.tr}</span><I className="h-4 w-4" /></div><h3 className="mt-1 text-sm font-semibold">{k.t}</h3><p className="text-xl font-extrabold">{k.v}</p><p className="text-xs opacity-80">{k.s}</p></article>; })}
        </section>

        <section className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-amber-700"><ShieldAlert className="h-4 w-4" /> Smart Anomaly Alerts</h3>
            <button className="rounded-lg border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-700">Refresh Alerts</button>
          </div>
          <p className="text-sm text-slate-600">Auto-detection ya spikes, mismatch na missing critical data.</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {anomalyAlerts.map((alert) => <li key={alert}>• {alert}</li>)}
          </ul>
        </section>
        {loadingRecords && <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">Inapakia rekodi za ibada...</div>}
        {loadError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{loadError}</div>}
        {statusNote && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{statusNote}</div>}

        <nav className="flex gap-2 overflow-auto rounded-2xl border border-blue-200 bg-white p-2">{tabs.map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap ${tab === t ? "bg-blue-700 text-white" : "bg-blue-50 text-blue-900"}`}>{t}</button>)}</nav>

        {tab === "Fomu ya Ibada" && <section className="rounded-2xl border border-blue-200 bg-white p-4"><h3 className="font-bold text-blue-900">Fomu Rasmi ya Mahudhurio ya Ibada</h3><div className="my-3 flex items-center justify-between rounded-xl border bg-[#f8f3e8] p-3"><div>Logo</div><div className="text-center"><p className="font-bold">KANISA LA MENNONITE LA KIINJILI TANZANIA</p><p className="font-semibold text-blue-900">MAHUDHURIO YA IBADA</p></div><div>Form #001</div></div><div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">{["Tawi","Jimbo","Dayosisi","Tarehe","Aina ya Ibada","Ibada ya 1","Ibada ya 2","Jumla ya Ibada","Mhubiri","Andiko Kuu","Katibu / Mwandishi","Mahali pa Ibada"].map((f)=><input key={f} className="rounded-xl border border-blue-200 px-3 py-2" placeholder={f} />)}</div><div className="mt-3 flex flex-wrap gap-2"><button className="rounded-lg bg-blue-700 px-3 py-2 text-sm text-white">Save Draft</button><button className="rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white">Submit for Review</button><button className="rounded-lg bg-amber-600 px-3 py-2 text-sm text-white">Clear Form</button><button className="rounded-lg bg-purple-700 px-3 py-2 text-sm text-white">Duplicate Previous Service</button></div></section>}

        {tab === "Mahudhurio" && <section className="rounded-2xl border border-blue-200 bg-white p-4"><h3 className="font-bold text-blue-900">Jedwali la Mahudhurio ya Ibada</h3><div className="mt-2 grid gap-2 md:grid-cols-2">{(["wakubwa","watoto","wageniMe","wageniKe","waliotubu","waliookoka","waliobatizwa"] as const).map((k)=> <label key={k} className="flex items-center justify-between rounded-xl border border-blue-100 p-3"><span className="font-semibold text-blue-900">{attendanceLabels[k]}</span><input type="number" min={0} value={attendance[k]} onChange={(e)=>setAttendance((s)=>({...s,[k]:Math.max(0,Number(e.target.value||0))}))} className="w-28 rounded border border-blue-200 px-2 py-1 text-right" /></label>)}</div><div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm">Wageni Wote (Auto): <b>{attendanceTotals.wageniWote}</b> | Jumla Kuu (Auto): <b>{attendanceTotals.total}</b></div></section>}

        {tab === "Sadaka na Matoleo" && <section className="rounded-2xl border border-blue-200 bg-white p-4"><h3 className="font-bold text-blue-900">Jedwali la Sadaka, Zaka na Mapato ya Ibada</h3><div className="mt-2 grid gap-2 md:grid-cols-2">{(["sadaka","zaka","matoleo","fedhaTaslimu","fedhaSimuBank","matumizi","salioLilipita"] as const).map((k)=> <label key={k} className="flex items-center justify-between rounded-xl border border-blue-100 p-3"><span className="font-semibold text-blue-900">{offeringLabels[k]}</span><input type="number" min={0} value={offering[k]} onChange={(e)=>setOffering((s)=>({...s,[k]:Math.max(0,Number(e.target.value||0))}))} className="w-32 rounded border border-blue-200 px-2 py-1 text-right" /></label>)}</div><div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm">Jumla ya Mapato: <b>TSh {offeringTotal.toLocaleString()}</b> | Salio Jipya: <b>TSh {newBalance.toLocaleString()}</b> | Variance: <b>TSh {(offering.fedhaTaslimu + offering.fedhaSimuBank - offeringTotal).toLocaleString()}</b></div>{!validation.valid && <div className="mt-2 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{validation.errors.join(" | ")}</div>}</section>}

        {tab === "Rekodi za Ibada" && <section className="rounded-2xl border border-blue-200 bg-white p-4"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-blue-900">Orodha ya Rekodi za Mahudhurio ya Ibada na Sadaka</h3><div className="flex gap-2"><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search by tarehe / tawi / jimbo..." className="rounded-lg border border-blue-200 px-2 py-1"/><button onClick={handleAddRecord} className="rounded-lg bg-blue-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50" disabled={!can("add") || busy} title={!can("add") ? "No permission" : ""}>Add Record</button><button onClick={() => window.print()} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold">Export PDF</button><button onClick={exportText} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold">Export Text</button></div></div><div className="mb-2 flex items-center justify-between text-xs text-slate-600"><span>Inaonyesha rekodi {filteredRecords.length} kati ya {records.length}</span><button onClick={resetRecordFilters} className="rounded-md border border-blue-200 px-2 py-1 font-semibold text-blue-700">Reset Filters</button></div><div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-5"><select value={approvalFilter} onChange={(e) => setApprovalFilter(e.target.value)} className="rounded-lg border border-blue-200 px-2 py-1 text-sm"><option>All</option>{approvalOptions.map((o) => <option key={o}>{o}</option>)}</select><select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="rounded-lg border border-blue-200 px-2 py-1 text-sm"><option>All</option>{serviceOptions.map((o) => <option key={o}>{o}</option>)}</select><select value={creatorFilter} onChange={(e) => setCreatorFilter(e.target.value)} className="rounded-lg border border-blue-200 px-2 py-1 text-sm"><option>All</option>{creatorOptions.map((o) => <option key={o}>{o}</option>)}</select><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-lg border border-blue-200 px-2 py-1 text-sm" /><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-lg border border-blue-200 px-2 py-1 text-sm" /></div><div className="overflow-auto"><table className="min-w-[1400px] w-full text-sm"><thead className="bg-gradient-to-r from-blue-900 to-blue-700 text-white"><tr>{["ID","Tarehe","Dayosisi","Jimbo","Tawi","Aina","Ibada ya 1","Ibada ya 2","Jumla Mahudhurio","Jumla Mapato","Salio Jipya","Mhubiri","Approval","Created By","Last Updated","Actions"].map((h)=><th key={h} className="border-b border-blue-300 px-2 py-2 text-left">{h}</th>)}</tr></thead><tbody>{filteredRecords.length === 0 ? <tr><td colSpan={16} className="px-3 py-6 text-center text-sm text-slate-500">Hakuna rekodi zilizopatikana kwa filter ulizoweka.</td></tr> : filteredRecords.map((r)=>{ const isLocked = lockedRecordIds.includes(r.id) || r.approvalStatus === "Locked"; return <tr key={r.id} className="hover:bg-blue-50"><td className="px-2 py-2">{r.id}</td><td>{r.tarehe}</td><td>{r.dayosisi}</td><td>{r.jimbo}</td><td>{r.tawi}</td><td>{r.ainaYaIbada}</td><td>{r.ibada1}</td><td>{r.ibada2}</td><td>{r.jumlaMahudhurio}</td><td>TSh {r.jumlaMapato.toLocaleString()}</td><td>TSh {r.salioJipya.toLocaleString()}</td><td>{r.mhubiri}</td><td><span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs">{r.approvalStatus}</span></td><td>{r.createdBy}</td><td>{r.lastUpdated}</td><td className="flex gap-1 py-2"><button onClick={() => setSelectedRecordId(r.id)} className="rounded bg-blue-100 px-2 py-1 text-xs">View</button><button onClick={() => handleDuplicate(r)} disabled={busy} className="rounded bg-slate-100 px-2 py-1 text-xs disabled:opacity-60">Duplicate</button><button onClick={() => { setSelectedRecordId(r.id); setTab("WhatsApp Summary Generator"); }} className="rounded bg-emerald-100 px-2 py-1 text-xs">WhatsApp</button><button onClick={() => window.print()} className="rounded bg-amber-100 px-2 py-1 text-xs">Print</button><button onClick={() => handleToggleLock(r)} disabled={busy} className="rounded bg-indigo-100 px-2 py-1 text-xs disabled:opacity-60">{isLocked ? "Unlock" : "Lock"}</button><button onClick={() => handleDelete(r.id)} disabled={busy} className="rounded bg-rose-100 px-2 py-1 text-xs disabled:opacity-60">Delete</button></td></tr>;})}</tbody></table></div></section>}

        {tab === "Weekly Reports" && <section className="rounded-2xl border border-blue-200 bg-white p-4"><h3 className="font-bold text-blue-900">Weekly Reports</h3><div className="overflow-auto"><table className="mt-2 min-w-[1000px] w-full text-sm"><thead className="bg-blue-50 text-blue-900"><tr>{["Wiki","Idadi ya Ibada","Jumla ya Mahudhurio","Average Attendance","Jumla ya Sadaka","Jumla ya Matumizi","Net Balance","Growth %","Actions"].map((h)=><th key={h} className="px-2 py-2 text-left">{h}</th>)}</tr></thead><tbody>{weeklyRows.map((r)=><tr key={r.wiki} className="border-t"><td className="px-2 py-2">{r.wiki}</td><td>{r.ibada}</td><td>{r.mahudhurio}</td><td>{r.avg}</td><td>TSh {r.sadaka.toLocaleString()}</td><td>TSh {r.matumizi.toLocaleString()}</td><td>TSh {r.net.toLocaleString()}</td><td>{r.growth}</td><td className="text-xs">View | Export PDF | Export Excel | Print</td></tr>)}</tbody></table></div></section>}

        {tab === "Monthly Reports" && <section className="rounded-2xl border border-blue-200 bg-white p-4"><h3 className="font-bold text-blue-900">Monthly Reports</h3><div className="overflow-auto"><table className="mt-2 min-w-[1000px] w-full text-sm"><thead className="bg-blue-50 text-blue-900"><tr>{["Mwezi","Idadi ya Ibada","Jumla ya Mahudhurio","Average Attendance","Total Offerings","Total Expenses","Net Balance","Best Service Day","Actions"].map((h)=><th key={h} className="px-2 py-2 text-left">{h}</th>)}</tr></thead><tbody>{monthlyRows.map((r)=><tr key={r.mwezi} className="border-t"><td className="px-2 py-2">{r.mwezi}</td><td>{r.ibada}</td><td>{r.mahudhurio}</td><td>{r.avg}</td><td>TSh {r.offerings.toLocaleString()}</td><td>TSh {r.expenses.toLocaleString()}</td><td>TSh {r.net.toLocaleString()}</td><td>{r.best}</td><td className="text-xs">View | Compare | Export</td></tr>)}</tbody></table></div></section>}

        {tab === "Yearly Reports" && <section className="rounded-2xl border border-blue-200 bg-white p-4"><h3 className="font-bold text-blue-900">Yearly Reports</h3><div className="overflow-auto"><table className="mt-2 min-w-[1000px] w-full text-sm"><thead className="bg-blue-50 text-blue-900"><tr>{["Mwaka","Total Services","Total Attendance","Total Offerings","Total Expenses","Closing Balance","Growth Trend","Actions"].map((h)=><th key={h} className="px-2 py-2 text-left">{h}</th>)}</tr></thead><tbody>{yearlyRows.map((r)=><tr key={r.mwaka} className="border-t"><td className="px-2 py-2">{r.mwaka}</td><td>{r.ibada}</td><td>{r.mahudhurio}</td><td>TSh {r.offerings.toLocaleString()}</td><td>TSh {r.expenses.toLocaleString()}</td><td>TSh {r.closing.toLocaleString()}</td><td>{r.trend}</td><td className="text-xs">View | Compare</td></tr>)}</tbody></table></div></section>}

        {tab === "Charts & Analytics" && <section className="grid gap-3 md:grid-cols-2"><article className="rounded-2xl border border-blue-200 bg-white p-4"><h3 className="font-bold text-blue-900">Attendance trend by week</h3><div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={analyticsData.length ? analyticsData : chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="attendance" stroke="#1e56c0" /></LineChart></ResponsiveContainer></div></article><article className="rounded-2xl border border-blue-200 bg-white p-4"><h3 className="font-bold text-blue-900">Offerings trend by week</h3><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={analyticsData.length ? analyticsData : chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="offering" fill="#d3a844" /></BarChart></ResponsiveContainer></div></article></section>}

        {tab === "WhatsApp Summary Generator" && <section className="rounded-2xl border border-blue-200 bg-white p-4"><h3 className="font-bold text-blue-900">WhatsApp Summary Generator</h3><pre className="mt-2 rounded-xl bg-slate-950 p-3 text-xs text-slate-100 whitespace-pre-wrap">{waText}</pre><div className="mt-2 flex gap-2"><button className="rounded bg-blue-700 px-3 py-2 text-xs text-white" onClick={async()=>{await navigator.clipboard.writeText(waText); setCopied(true); setTimeout(()=>setCopied(false),1500);}}><Copy className="mr-1 inline h-3 w-3" /> Copy</button><button onClick={() => setSelectedRecordId(records[0]?.id ?? null)} className="rounded bg-slate-200 px-3 py-2 text-xs">Regenerate</button><button onClick={() => window.print()} className="rounded bg-slate-200 px-3 py-2 text-xs">Share Preview</button><button onClick={exportText} className="rounded bg-slate-200 px-3 py-2 text-xs">Export as text</button>{copied && <span className="text-xs text-emerald-700">Copied!</span>}</div></section>}

        {tab === "Printable A4 Official Form" && <section className="rounded-2xl border border-blue-200 bg-white p-4 print:shadow-none"><h3 className="text-center font-bold text-blue-900">KANISA LA MENNONITE LA KIINJILI TANZANIA</h3><p className="text-center font-semibold">MAHUDHURIO YA IBADA</p><div className="my-2 border-t-4 border-double border-amber-500" /><p className="text-sm">Tawi: Nkuyu | Jimbo: Nkuyu Central | Dayosisi: Kaskazini | Tarehe: 2026-04-26</p><p className="text-sm">Mahudhurio: 569 | Jumla ya Mapato: TSh 2,406,000 | Salio Jipya: TSh 3,126,000</p><p className="mt-2 text-sm">Sahihi: Katibu ________ Mchungaji ________ Treasurer ________</p><button className="mt-2 rounded bg-blue-700 px-3 py-2 text-xs text-white print:hidden"><Printer className="mr-1 inline h-3 w-3" /> Print Official Form</button></section>}

        {tab === "Approval Workflow" && <section className="rounded-2xl border border-blue-200 bg-white p-4"><h3 className="font-bold text-blue-900">Uhakiki na Uidhinishaji</h3><p className="mt-1 text-sm text-slate-600">Record: {selectedRecord?.tawi ?? "N/A"} | Tarehe: {selectedRecord?.tarehe ?? "N/A"}</p><div className="mt-2 grid gap-2 md:grid-cols-4">{approvalSteps.map((step)=><article key={step.label} className="rounded-xl border border-blue-100 p-3"><p className="font-semibold">{step.label}</p><p className="text-xs text-slate-600">{step.actor}</p><p className="text-xs font-semibold text-blue-700">Status: {step.status}</p></article>)}</div></section>}
        {tab === "Attachments & Evidence" && <section className="rounded-2xl border border-blue-200 bg-white p-4"><h3 className="font-bold text-blue-900">Attachments & Evidence</h3><div className="mt-2 rounded-xl border-2 border-dashed border-blue-300 p-6 text-center text-sm text-slate-600">Upload | View | Download | Delete</div></section>}
        {tab === "Audit Trail / Change Logs" && <section className="rounded-2xl border border-blue-200 bg-white p-4"><h3 className="font-bold text-blue-900">Historia ya Mabadiliko</h3><p className="text-sm text-slate-600">Date, User, Role, Action, Record ID, Old Value, New Value, Status.</p></section>}
        {tab === "PDF Export Center" && <section className="rounded-2xl border border-blue-200 bg-white p-4"><h3 className="font-bold text-blue-900">PDF / Export Center</h3><div className="overflow-auto"><table className="mt-2 min-w-[900px] w-full text-sm"><thead className="bg-blue-50 text-blue-900"><tr>{["File Name","Type","Date","Generated By","Format","Size","Actions"].map((h)=><th key={h} className="px-2 py-2 text-left">{h}</th>)}</tr></thead><tbody><tr className="border-t"><td className="px-2 py-2">worship-2026-04-26</td><td>Official Form</td><td>2026-04-26</td><td>{role}</td><td>PDF</td><td>420KB</td><td className="text-xs">Download | Print | Delete | Re-generate</td></tr></tbody></table></div></section>}
        {tab === "Historical Archive" && <section className="rounded-2xl border border-blue-200 bg-white p-4"><h3 className="font-bold text-blue-900">Historical Archive</h3><div className="text-sm text-slate-600">Kumbukumbu za zamani za mahudhurio, sadaka na approvals kwa uchambuzi wa muda mrefu.</div><div className="mt-2 text-sm">Total archived records: <b>{records.length}</b> | Last archived date: <b>{summaryMetrics.latest?.tarehe ?? "N/A"}</b></div></section>}
      </div>
    </div>
  );
}
