import { useCallback, useEffect, useMemo, useState } from "react";
import type { Column } from "../common/PremiumTable";
import { PremiumTable } from "../common/PremiumTable";
import { ConfirmModal } from "../common/ConfirmModal";
import { SettingsSupabaseBanner } from "../settings/SettingsSupabaseBanner";
import { usePortal } from "../../context/PortalContext";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import type { PortalDirectoryProfile, PortalModuleMatrixRow, UserRole } from "../../types";
import {
  buildAcceptInviteLink,
  createPhase34Invite,
  fetchPhase34Invites,
  markInviteResendMeta,
  revokePhase34Invite,
  type Phase34InviteRow,
  type Phase34ScopeLevel,
} from "../../services/phase34InviteService";
import { sendInviteEmail, type Phase35SendInviteResponse } from "../../services/phase35InviteEmailService";
import {
  applyRoleChange,
  assertRoleChangeAllowed,
  fetchDirectoryProfiles,
  fetchRoleChangeHistory,
  inferRoleChangeAction,
  type Phase34RoleChangeRow,
} from "../../services/phase34PromotionService";
import {
  canEditPermissionsMatrix,
  canViewPermissionsMatrix,
  loadMatrixSafe,
  loadRolesForMatrix,
  saveMatrixSafe,
} from "../../services/phase34PermissionsService";
import { AccountLifecyclePanel } from "./AccountLifecyclePanel";
import { safeArray, safeIncludes, safeLower } from "../../lib/safe";
const MATRIX_FLAGS = ["can_view", "can_create", "can_edit", "can_delete", "can_export", "can_audit"] as const;

function tabFromSubmodule(sub: string | undefined): "invite" | "lifecycle" | "promote" | "matrix" | "history" {
  const s = safeLower(sub ?? "");
  if (s.includes("mwaliko")) return "invite";
  if (s.includes("maisha") || s.includes("lifecycle") || (s.includes("akaunti") && s.includes("36"))) return "lifecycle";
  if (s.includes("vyeo")) return "promote";
  if (s.includes("matrix") || s.includes("ruhusa")) return "matrix";
  if (s.includes("historia")) return "history";
  return "invite";
}

function statusInviteClass(st: string): string {
  switch (st) {
    case "pending":
      return "bg-amber-50 text-amber-900 border-amber-200";
    case "accepted":
      return "bg-emerald-50 text-emerald-900 border-emerald-200";
    case "expired":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "revoked":
      return "bg-rose-50 text-rose-900 border-rose-200";
    default:
      return "bg-slate-50 text-slate-800 border-slate-200";
  }
}

interface Props {
  submodule?: string;
}

export function InvitePromotePermissionsPanel({ submodule }: Props) {
  const { role, pushToast, reportError, logAudit } = usePortal();
  const [tab, setTab] = useState<ReturnType<typeof tabFromSubmodule>>(() => tabFromSubmodule(submodule));

  const [invites, setInvites] = useState<Phase34InviteRow[]>([]);
  const [profiles, setProfiles] = useState<PortalDirectoryProfile[]>([]);
  const [history, setHistory] = useState<Phase34RoleChangeRow[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [scopeLevel, setScopeLevel] = useState<Phase34ScopeLevel>("national");
  const [dayosisi, setDayosisi] = useState("");
  const [jimbo, setJimbo] = useState("");
  const [tawi, setTawi] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [lastEdgeSend, setLastEdgeSend] = useState<Phase35SendInviteResponse | null>(null);

  const [promoteSearch, setPromoteSearch] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<PortalDirectoryProfile | null>(null);
  const [newRoleKey, setNewRoleKey] = useState("");
  const [promoteReason, setPromoteReason] = useState("");
  const [promoteBusy, setPromoteBusy] = useState(false);
  const [confirmRoleChange, setConfirmRoleChange] = useState<{
    profile: PortalDirectoryProfile;
    newRoleKey: string;
    reason: string;
    action: "promote" | "demote";
  } | null>(null);

  const [matrixRoles, setMatrixRoles] = useState<{ role_key: string; label_sw: string }[]>([]);
  const [matrixRoleKey, setMatrixRoleKey] = useState("");
  const [matrixRows, setMatrixRows] = useState<PortalModuleMatrixRow[]>([]);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [matrixSaving, setMatrixSaving] = useState(false);

  const [historySearch, setHistorySearch] = useState("");
  const [inviteToRevoke, setInviteToRevoke] = useState<Phase34InviteRow | null>(null);

  const allowed = role === "chief_admin" || role === "super_admin";
  const canEditMatrix = canEditPermissionsMatrix(role as UserRole);
  const canViewMatrix = canViewPermissionsMatrix(role as UserRole);

  useEffect(() => {
    setTab(tabFromSubmodule(submodule));
  }, [submodule]);

  const loadInvites = useCallback(async () => {
    setLoadingInvites(true);
    try {
      const rows = await fetchPhase34Invites();
      setInvites(rows);
    } catch (e) {
      reportError(e, "Phase34 invites");
      setInvites([]);
    } finally {
      setLoadingInvites(false);
    }
  }, [reportError]);

  const loadProfiles = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setProfiles([]);
      setLoadingProfiles(false);
      return;
    }
    setLoadingProfiles(true);
    try {
      const rows = await fetchDirectoryProfiles();
      setProfiles(rows);
    } catch (e) {
      reportError(e, "Phase34 profiles");
      setProfiles([]);
    } finally {
      setLoadingProfiles(false);
    }
  }, [reportError]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const rows = await fetchRoleChangeHistory();
      setHistory(rows);
    } catch (e) {
      reportError(e, "Phase34 history");
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [reportError]);

  useEffect(() => {
    void loadInvites();
    void loadProfiles();
    void loadHistory();
  }, [loadInvites, loadProfiles, loadHistory]);

  useEffect(() => {
    void (async () => {
      const list = await loadRolesForMatrix();
      setMatrixRoles(list);
      setMatrixRoleKey((k) => k || list[0]?.role_key || "");
    })();
  }, []);

  useEffect(() => {
    if (!matrixRoleKey || !canViewMatrix) return;
    void (async () => {
      setMatrixLoading(true);
      try {
        const m = await loadMatrixSafe(matrixRoleKey);
        setMatrixRows(m);
      } catch (e) {
        reportError(e, "Matrix load");
        setMatrixRows([]);
      } finally {
        setMatrixLoading(false);
      }
    })();
  }, [matrixRoleKey, canViewMatrix, reportError]);

  const kpis = useMemo(() => {
    const pending = invites.filter((i) => i.status === "pending").length;
    const accepted = invites.filter((i) => i.status === "accepted").length;
    const recent = history.filter((h) => {
      const t = new Date(h.created_at).getTime();
      return Date.now() - t < 30 * 86400000;
    }).length;
    return [
      { label: "Mialiko inayosubiri", value: String(pending), tone: "from-amber-600 to-orange-700" },
      { label: "Yalikubaliwa", value: String(accepted), tone: "from-emerald-600 to-teal-800" },
      { label: "Wasifu wa directory", value: String(profiles.length), tone: "from-blue-800 to-indigo-900" },
      { label: "Mabadiliko (siku 30)", value: String(recent), tone: "from-violet-700 to-purple-900" },
    ];
  }, [invites, history, profiles.length]);

  const filteredProfiles = useMemo(() => {
    const q = safeLower(promoteSearch).trim();
    if (!q) return safeArray(profiles);
    return safeArray(profiles).filter(
      (p) =>
        safeIncludes(p.full_name, q) ||
        safeIncludes(p.email, q) ||
        safeIncludes(p.phone, q) ||
        safeIncludes(p.role_key, q)
    );
  }, [profiles, promoteSearch]);

  const filteredInvites = useMemo(() => {
    const q = safeLower(historySearch).trim();
    if (!q) return safeArray(invites);
    return safeArray(invites).filter(
      (i) => safeIncludes(i.email, q) || safeIncludes(i.role_key, q) || safeIncludes(i.status, q)
    );
  }, [invites, historySearch]);

  async function onSendRealInviteEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteRole) {
      pushToast("Jaza barua pepe na jukumu.", "error");
      return;
    }
    setInviteBusy(true);
    setLastEdgeSend(null);
    try {
      const res = await sendInviteEmail({
        email: inviteEmail,
        role_key: inviteRole,
        scope_level: scopeLevel,
        dayosisi_scope: scopeLevel !== "national" ? dayosisi : undefined,
        jimbo_scope: scopeLevel === "jimbo" || scopeLevel === "tawi" ? jimbo : undefined,
        tawi_scope: scopeLevel === "tawi" ? tawi : undefined,
        message: inviteMsg,
      });
      setLastEdgeSend(res);
      if (res.ok) {
        await logAudit("phase35_invite_dispatch", "phase34_invites", res.invite_id ?? "", {
          email_sent: res.email_sent,
          mock_mode: res.mock_mode,
        });
        pushToast(res.email_sent ? "Barua ya mwaliko imetumwa." : "Mwaliko umehifadhiwa.", res.email_sent ? "success" : "info");
        setInviteEmail("");
        setInviteMsg("");
        await loadInvites();
        const raw = res.raw_token_for_fallback;
        const showCopy = Boolean(raw && (import.meta.env.DEV || res.email_error));
        if (showCopy && raw) {
          try {
            await navigator.clipboard.writeText(buildAcceptInviteLink(raw));
            pushToast("Kiungo kimenakiliwa (mfumo wa majaribio au barua imekoswa).", "info");
          } catch {
            pushToast(`Kiungo: ${buildAcceptInviteLink(raw)}`, "info");
          }
        }
      } else {
        pushToast(res.error ?? "Edge Function haipo au imeshindwa.", "error");
        await loadInvites();
      }
    } catch (err) {
      reportError(err, "phase35-send-invite");
      pushToast("Imeshindwa kutuma mwaliko.", "error");
      await loadInvites();
    } finally {
      setInviteBusy(false);
    }
  }

  async function onSaveInviteOffline() {
    if (!inviteEmail.trim() || !inviteRole) {
      pushToast("Jaza barua pepe na jukumu.", "error");
      return;
    }
    setInviteBusy(true);
    try {
      const { row, rawTokenOnce } = await createPhase34Invite({
        email: inviteEmail,
        role_key: inviteRole,
        scope_level: scopeLevel,
        dayosisi_scope: scopeLevel !== "national" ? dayosisi : undefined,
        jimbo_scope: scopeLevel === "jimbo" || scopeLevel === "tawi" ? jimbo : undefined,
        tawi_scope: scopeLevel === "tawi" ? tawi : undefined,
        message: inviteMsg,
      });
      await logAudit("phase34_invite_create", "phase34_invites", row.id, { email: row.email });
      pushToast("Mwaliko umehifadhiwa. Token si kwenye DB — nakili kiungo mara moja.", "success");
      setInviteEmail("");
      setInviteMsg("");
      await loadInvites();
      try {
        await navigator.clipboard.writeText(buildAcceptInviteLink(rawTokenOnce));
        pushToast("Kiungo kimenakiliwa.", "info");
      } catch {
        pushToast(`Kiungo: ${buildAcceptInviteLink(rawTokenOnce)}`, "info");
      }
    } catch (err) {
      reportError(err, "Mwaliko");
      pushToast("Imeshindwa kuhifadhi mwaliko.", "error");
    } finally {
      setInviteBusy(false);
    }
  }

  async function runConfirmedRoleChange() {
    const ctx = confirmRoleChange;
    if (!ctx) return;
    setPromoteBusy(true);
    try {
      assertRoleChangeAllowed(role as UserRole, ctx.profile, ctx.newRoleKey);
      await applyRoleChange({
        actorRole: role as UserRole,
        profile: ctx.profile,
        newRoleKey: ctx.newRoleKey,
        reason: ctx.reason,
        action: ctx.action,
      });
      await logAudit("phase34_role_change", "portal_directory_profiles", ctx.profile.id, {
        from: ctx.profile.role_key,
        to: ctx.newRoleKey,
      });
      pushToast("Jukumu limebadilishwa.", "success");
      setConfirmRoleChange(null);
      setSelectedProfile(null);
      setNewRoleKey("");
      setPromoteReason("");
      await loadProfiles();
      await loadHistory();
    } catch (err) {
      reportError(err, "Vyeo");
      pushToast("Imeshindwa kubadilisha jukumu.", "error");
    } finally {
      setPromoteBusy(false);
    }
  }

  function toggleMatrix(moduleKey: string, flag: (typeof MATRIX_FLAGS)[number]) {
    if (!canEditMatrix) return;
    setMatrixRows((prev) =>
      prev.map((r) => (r.module_key === moduleKey ? { ...r, [flag]: !r[flag] } : r))
    );
  }

  async function saveMatrix() {
    if (!canEditMatrix) return;
    setMatrixSaving(true);
    try {
      await saveMatrixSafe(matrixRows, role as UserRole);
      await logAudit("phase34_matrix_save", "portal_module_matrix", matrixRoleKey);
      pushToast("Matrix imehifadhiwa.", "success");
      const m = await loadMatrixSafe(matrixRoleKey);
      setMatrixRows(m);
    } catch (e) {
      reportError(e, "Matrix");
      pushToast("Imeshindwa kuhifadhi matrix.", "error");
    } finally {
      setMatrixSaving(false);
    }
  }

  const inviteColumns: Column<Phase34InviteRow>[] = useMemo(
    () => [
      { key: "email", label: "Barua pepe", sortable: true },
      { key: "role_key", label: "Jukumu", sortable: true },
      { key: "scope_type", label: "Ngazi / scope", sortable: true },
      {
        key: "status",
        label: "Hali",
        sortable: true,
        filterValues: ["pending", "accepted", "expired", "revoked"],
        render: (r) => (
          <span className={`rounded-lg border px-2 py-0.5 text-xs font-medium ${statusInviteClass(r.status)}`}>
            {r.status}
          </span>
        ),
      },
      {
        key: "expires_at",
        label: "Mwisho",
        sortable: true,
        render: (r) => {
          const d = new Date(r.expires_at);
          return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("sw-TZ");
        },
      },
      {
        key: "_act",
        label: "Vitendo",
        render: (r) => (
          <div className="flex flex-wrap gap-1">
            <span className="text-[10px] text-slate-500" title="Token si kwenye jedwali — tumia Edge au unda mwaliko upya.">
              Hakuna kiungo kwenye rekodi
            </span>
            {r.status === "pending" ? (
              <>
                <button
                  type="button"
                  className="rounded border border-amber-200 px-2 py-0.5 text-[10px] text-amber-900 hover:bg-amber-50"
                  onClick={async () => {
                    try {
                      await markInviteResendMeta(r.id);
                      pushToast("Imerekodiwa (tuma barua kwa mikono).", "info");
                      await loadInvites();
                    } catch (e) {
                      reportError(e, "resend");
                    }
                  }}
                >
                  Rudisha tuma
                </button>
                <button
                  type="button"
                  className="rounded border border-rose-200 px-2 py-0.5 text-[10px] text-rose-800 hover:bg-rose-50"
                  onClick={() => setInviteToRevoke(r)}
                >
                  Futa mwaliko
                </button>
              </>
            ) : null}
          </div>
        ),
      },
    ],
    [pushToast, loadInvites, reportError]
  );

  const profileColumns: Column<PortalDirectoryProfile>[] = useMemo(
    () => [
      { key: "full_name", label: "Jina", sortable: true, render: (r) => r.full_name ?? "—" },
      { key: "email", label: "Barua pepe", sortable: true },
      { key: "phone", label: "Simu", sortable: true, render: (r) => r.phone ?? "—" },
      { key: "role_key", label: "Jukumu", sortable: true },
      {
        key: "status",
        label: "Hali",
        sortable: true,
        filterValues: ["pending", "invited", "active", "suspended"],
      },
    ],
    []
  );

  const historyColumns: Column<Phase34RoleChangeRow>[] = useMemo(
    () => [
      { key: "created_at", label: "Tarehe", sortable: true, render: (r) => new Date(r.created_at).toLocaleString() },
      { key: "profile_id", label: "Wasifu ID", sortable: true },
      { key: "previous_role_key", label: "Kutoka", sortable: true },
      { key: "new_role_key", label: "Kwenda", sortable: true },
      { key: "action", label: "Kitendo", sortable: true },
      { key: "reason", label: "Sababu", sortable: true, render: (r) => r.reason ?? "—" },
    ],
    []
  );

  const roleOptions = useMemo(() => {
    const keys = new Set<string>();
    profiles.forEach((p) => keys.add(p.role_key));
    matrixRoles.forEach((r) => keys.add(r.role_key));
    return Array.from(keys).sort();
  }, [profiles, matrixRoles]);

  if (!allowed) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-900">
        <p className="font-semibold">Huna ruhusa ya kitengo hiki.</p>
        <p className="mt-2 text-sm">Chief Admin au Super Admin pekee.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsSupabaseBanner />
      <header className="rounded-2xl border border-[#1e3a6e]/30 bg-gradient-to-r from-[#0a1628] via-[#132952] to-[#1e3a6e] p-6 text-white shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Phase 34</p>
        <h2 className="mt-1 text-2xl font-bold">Mialiko, Kupandisha Vyeo & Ruhusa</h2>
        <p className="mt-2 text-sm text-blue-100">Invite, Promote & Permissions — usimamizi wa kitaifa.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={`rounded-2xl bg-gradient-to-br ${k.tone} px-4 py-4 text-white shadow-md`}
          >
            <p className="text-xs font-medium text-white/90">{k.label}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        {(
          [
            ["invite", "Mwaliko"],
            ["lifecycle", "Maisha ya akaunti"],
            ["promote", "Vyeo"],
            ["matrix", "Matrix ya ruhusa"],
            ["history", "Historia"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === id ? "bg-blue-900 text-white shadow" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "invite" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={onSendRealInviteEmail} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[#0f1e46]">Tuma mwaliko</h3>
            <p className="text-xs text-slate-600">
              <strong>Tuma barua pepe (Edge):</strong> inaunda rekodi + token_hash pekee kwenye DB, halafu inatuma barua ikiwa SendGrid / Auth iko sawa. Ikiwa Edge haipo, hutajiri ujumbe salama bila kuanguka.
            </p>
            <label className="grid gap-1 text-sm font-medium text-slate-800">
              Barua pepe
              <input
                required
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-800">
              Jukumu
              <select
                required
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="">—</option>
                {matrixRoles.map((r) => (
                  <option key={r.role_key} value={r.role_key}>
                    {r.label_sw} ({r.role_key})
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-800">
              Ngazi / scope
              <select
                value={scopeLevel}
                onChange={(e) => setScopeLevel(e.target.value as Phase34ScopeLevel)}
                className="rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="national">National</option>
                <option value="diocese">Diocese</option>
                <option value="jimbo">Jimbo</option>
                <option value="tawi">Tawi / Parokia / Kituo</option>
              </select>
            </label>
            {scopeLevel !== "national" ? (
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Dayosisi
                <input value={dayosisi} onChange={(e) => setDayosisi(e.target.value)} className="rounded-xl border px-3 py-2" />
              </label>
            ) : null}
            {(scopeLevel === "jimbo" || scopeLevel === "tawi") && (
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Jimbo
                <input value={jimbo} onChange={(e) => setJimbo(e.target.value)} className="rounded-xl border px-3 py-2" />
              </label>
            )}
            {scopeLevel === "tawi" && (
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Tawi / Parokia
                <input value={tawi} onChange={(e) => setTawi(e.target.value)} className="rounded-xl border px-3 py-2" />
              </label>
            )}
            <label className="grid gap-1 text-sm font-medium text-slate-800">
              Ujumbe (si lazima)
              <textarea value={inviteMsg} onChange={(e) => setInviteMsg(e.target.value)} rows={2} className="rounded-xl border px-3 py-2" />
            </label>
            <button
              type="submit"
              disabled={inviteBusy}
              className="w-full rounded-xl bg-blue-900 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {inviteBusy ? "Inachakata…" : "Tuma barua pepe halisi (Edge · phase35-send-invite)"}
            </button>
            {import.meta.env.DEV ? (
              <button
                type="button"
                disabled={inviteBusy}
                onClick={() => void onSaveInviteOffline()}
                className="w-full rounded-xl border border-slate-300 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                DEV: Hifadhi + nakili kiungo (bila kutuma barua)
              </button>
            ) : null}
            {lastEdgeSend?.ok ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                <span className="font-semibold">Hali ya mwisho:</span>{" "}
                {lastEdgeSend.email_sent ? (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-900">Barua imetumwa</span>
                ) : lastEdgeSend.mock_mode ? (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900">Barua haijatumwa (angalia SMTP/Edge)</span>
                ) : (
                  <span className="rounded bg-slate-200 px-1.5 py-0.5">Imehifadhiwa</span>
                )}
                {lastEdgeSend.warning ? <p className="mt-1 text-amber-800">{lastEdgeSend.warning}</p> : null}
                {lastEdgeSend.email_error ? (
                  <p className="mt-1 text-rose-700">Email: {String(lastEdgeSend.email_error).slice(0, 200)}</p>
                ) : null}
              </div>
            ) : null}
          </form>

          <div>
            <PremiumTable<Phase34InviteRow>
              title="Mialiko ya hivi karibuni"
              subtitle="phase34_invites"
              rows={invites.slice(0, 12)}
              columns={inviteColumns}
              canAdd={false}
              canEdit={false}
              canDelete={false}
              canExport={false}
              isLoading={loadingInvites}
            />
          </div>
        </div>
      ) : null}

      {tab === "lifecycle" ? <AccountLifecyclePanel /> : null}

      {tab === "promote" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <input
              placeholder="Tafuta jina, barua pepe, simu, jukumu…"
              value={promoteSearch}
              onChange={(e) => setPromoteSearch(e.target.value)}
              className="min-w-[200px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <PremiumTable<PortalDirectoryProfile>
            title="Watumishi / wasifu"
            subtitle="portal_directory_profiles"
            rows={filteredProfiles}
            columns={profileColumns}
            canAdd={false}
            onEdit={(r) => setSelectedProfile(r)}
            canEdit
            canDelete={false}
            canExport
            exportBasename="portal_directory_profiles"
            isLoading={loadingProfiles}
          />

          {selectedProfile ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
              <h3 className="font-semibold text-[#0f1e46]">Badilisha jukumu — {selectedProfile.email}</h3>
              <p className="mt-1 text-xs text-slate-600">Sasa: {selectedProfile.role_key}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium">
                  Jukumu jipya
                  <select
                    value={newRoleKey}
                    onChange={(e) => setNewRoleKey(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2"
                  >
                    <option value="">—</option>
                    {roleOptions.map((rk) => (
                      <option key={rk} value={rk}>
                        {rk}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-medium sm:col-span-2">
                  Sababu (lazima)
                  <textarea value={promoteReason} onChange={(e) => setPromoteReason(e.target.value)} rows={2} className="rounded-xl border px-3 py-2" />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
                  onClick={() => {
                    void (async () => {
                      if (!selectedProfile || !newRoleKey || !promoteReason.trim()) {
                        pushToast("Chagua jukumu jipya na andika sababu.", "error");
                        return;
                      }
                      if (newRoleKey === selectedProfile.role_key) {
                        pushToast("Chagua jukumu tofauti na la sasa.", "error");
                        return;
                      }
                      try {
                        assertRoleChangeAllowed(role as UserRole, selectedProfile, newRoleKey);
                        const inferred = await inferRoleChangeAction(selectedProfile.role_key, newRoleKey);
                        setConfirmRoleChange({
                          profile: selectedProfile,
                          newRoleKey,
                          reason: promoteReason.trim(),
                          action: inferred,
                        });
                      } catch (e) {
                        reportError(e, "validate");
                        pushToast(e instanceof Error ? e.message : "Hitilafu", "error");
                      }
                    })();
                  }}
                  disabled={promoteBusy || !newRoleKey}
                >
                  Thibitisha mabadiliko…
                </button>
                <button type="button" className="rounded-xl border border-slate-300 px-4 py-2 text-sm" onClick={() => setSelectedProfile(null)}>
                  Funga
                </button>
              </div>
            </div>
          ) : null}

          <ConfirmModal
            open={!!confirmRoleChange}
            title="Thibitisha mabadiliko ya jukumu"
            message={
              confirmRoleChange
                ? `${confirmRoleChange.action === "promote" ? "Kupandisha" : "Kupunguza"}: ${confirmRoleChange.profile.email} → ${confirmRoleChange.newRoleKey}. Una uhakika?`
                : ""
            }
            confirmLabel="Thibitisha"
            cancelLabel="Ghairi"
            confirmLoading={promoteBusy}
            onCancel={() => setConfirmRoleChange(null)}
            onConfirm={async () => {
              await runConfirmedRoleChange();
            }}
          />
        </div>
      ) : null}

      {tab === "matrix" && canViewMatrix ? (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <label className="grid gap-1 text-sm font-medium text-slate-800">
              Jukumu la matrix
              <select
                value={matrixRoleKey}
                onChange={(e) => setMatrixRoleKey(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2"
              >
                {matrixRoles.map((r) => (
                  <option key={r.role_key} value={r.role_key}>
                    {r.label_sw}
                  </option>
                ))}
              </select>
            </label>
            {canEditMatrix ? (
              <button
                type="button"
                disabled={matrixSaving || matrixLoading}
                onClick={() => void saveMatrix()}
                className="rounded-xl bg-blue-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {matrixSaving ? "Inahifadhi…" : "Hifadhi matrix"}
              </button>
            ) : (
              <p className="text-sm text-amber-800">Super Admin: mwonekano tu — uhariri ni kwa Chief Admin.</p>
            )}
          </div>
          {matrixRoleKey === "chief_admin" && role === "super_admin" ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Safu ya Chief Admin: vitufe vimezimwa kwa usalama (Super Admin).
            </p>
          ) : null}
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left">
                  <th className="p-2">Moduli</th>
                  {MATRIX_FLAGS.map((f) => (
                    <th key={f} className="p-2 capitalize">
                      {f.replace("can_", "")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row) => {
                  const disableRow =
                    !canEditMatrix ||
                    (matrixRoleKey === "chief_admin" && role === "super_admin");
                  return (
                    <tr key={row.module_key} className="border-b border-slate-100">
                      <td className="p-2 font-medium">{row.module_key}</td>
                      {MATRIX_FLAGS.map((f) => (
                        <td key={f} className="p-2">
                          <input
                            type="checkbox"
                            checked={!!row[f]}
                            disabled={disableRow}
                            onChange={() => toggleMatrix(row.module_key, f)}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {matrixLoading ? <p className="text-sm text-slate-500">Inapakia…</p> : null}
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <input
              placeholder="Tafuta katika historia ya mialiko…"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="min-w-[200px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm"
              onClick={() => window.print()}
            >
              Chapisha
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm"
              onClick={() => {
                const h = "Email,Role,Status,Expires,Created";
                const lines = filteredInvites.map((i) => `${i.email},${i.role_key},${i.status},${i.expires_at},${i.created_at}`);
                const blob = new Blob([[h, ...lines].join("\n")], { type: "text/csv" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "phase34_invites.csv";
                a.click();
                URL.revokeObjectURL(a.href);
              }}
            >
              Pakua CSV (mialiko)
            </button>
          </div>
          <PremiumTable<Phase34InviteRow>
            title="Historia ya mialiko"
            subtitle="phase34_invites"
            rows={filteredInvites}
            columns={inviteColumns}
            canAdd={false}
            canEdit={false}
            canDelete={false}
            canExport={false}
            isLoading={loadingInvites}
          />
          <PremiumTable<Phase34RoleChangeRow>
            title="Historia ya mabadiliko ya jukumu"
            subtitle="phase34_role_change_history"
            rows={history}
            columns={historyColumns}
            canAdd={false}
            canEdit={false}
            canDelete={false}
            canExport
            exportBasename="phase34_role_changes"
            isLoading={loadingHistory}
          />
        </div>
      ) : null}

      <ConfirmModal
        open={!!inviteToRevoke}
        title="Futa mwaliko"
        message={`Una hakika unataka kuondoa mwaliko kwa ${inviteToRevoke?.email ?? ""}?`}
        confirmLabel="Futa"
        onCancel={() => setInviteToRevoke(null)}
        onConfirm={async () => {
          if (!inviteToRevoke) return;
          try {
            await revokePhase34Invite(inviteToRevoke.id);
            await logAudit("phase34_invite_revoke", "phase34_invites", inviteToRevoke.id);
            pushToast("Mwaliko umebatilishwa.", "success");
            setInviteToRevoke(null);
            await loadInvites();
          } catch (e) {
            reportError(e, "revoke");
          }
        }}
      />
    </div>
  );
}
