import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Search, User } from "lucide-react";

export type LeadershipGalleryItem = {
  id: string;
  fullName: string;
  titleSw: string;
  hierarchy: string;
  roleKey?: string | null;
  cheo?: string | null;
  leadershipLevel?: string | null;
  updatedAt?: string | null;
  kind: "certificate" | "cv";
};

type Props = {
  items: LeadershipGalleryItem[];
  onPreview: (item: LeadershipGalleryItem) => void;
  onBulkExport?: (selected: LeadershipGalleryItem[]) => void;
};

export function LeadershipDocumentGallery({ items, onPreview, onBulkExport }: Props) {
  const [q, setQ] = useState("");
  const [hierarchy, setHierarchy] = useState("");
  const [kind, setKind] = useState<"" | "certificate" | "cv">("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((it) => {
      if (kind && it.kind !== kind) return false;
      if (hierarchy && !it.hierarchy.toLowerCase().includes(hierarchy.toLowerCase())) return false;
      if (!needle) return true;
      const blob = `${it.fullName} ${it.titleSw} ${it.cheo ?? ""} ${it.roleKey ?? ""}`.toLowerCase();
      return blob.includes(needle);
    });
  }, [items, q, hierarchy, kind]);

  const hierarchies = useMemo(() => [...new Set(items.map((i) => i.hierarchy).filter(Boolean))].sort(), [items]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-kmkt-display text-lg font-bold text-[#0B1F3A]">Galeri ya hati</h3>
        {onBulkExport && selected.size > 0 ? (
          <button
            type="button"
            onClick={() => onBulkExport(items.filter((i) => selected.has(i.id)))}
            className="rounded-lg bg-[#0B1F3A] px-3 py-1.5 text-xs font-semibold text-white"
          >
            Pakua {selected.size} PDF
          </button>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tafuta kiongozi…"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"
          />
        </label>
        <select value={hierarchy} onChange={(e) => setHierarchy(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">Ngazi zote</option>
          {hierarchies.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value as "" | "certificate" | "cv")} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">Cheti + CV</option>
          <option value="certificate">Cheti</option>
          <option value="cv">CV</option>
        </select>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {filtered.map((it) => (
          <motion.li
            key={it.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            className="flex items-start gap-3 rounded-xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/90 p-3 shadow-sm transition hover:border-amber-300/60 hover:shadow-md"
          >
            <input type="checkbox" checked={selected.has(it.id)} onChange={() => toggle(it.id)} className="mt-1" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-[#0B1F3A]">{it.fullName}</p>
              <p className="text-xs text-slate-600">{it.titleSw}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">{it.hierarchy}</p>
            </div>
            <button
              type="button"
              onClick={() => onPreview(it)}
              className="shrink-0 rounded-lg border border-amber-300/50 bg-white px-2 py-1 text-[11px] font-semibold text-[#0B1F3A]"
            >
              <FileText className="mr-1 inline h-3.5 w-3.5" />
              Hakiki
            </button>
          </motion.li>
        ))}
      </ul>
      {filtered.length === 0 ? (
        <p className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
          <User className="h-4 w-4" />
          Hakuna hati inayolingana.
        </p>
      ) : null}
    </div>
  );
}
