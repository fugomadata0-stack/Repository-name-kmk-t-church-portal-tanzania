import { useRef, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";

import { FileUp, ImageIcon, Loader2, PenLine, Stamp } from "lucide-react";

import type { StorageUploadProgress } from "../../lib/enterpriseStorageUpload";
import { validateLeadershipUploadFile } from "../../lib/leadershipUploadGuard";



export type { LeadershipUploadKind } from "../../lib/leadershipUploadGuard";
import type { LeadershipUploadKind } from "../../lib/leadershipUploadGuard";



const KIND_META: Record<

  LeadershipUploadKind,

  { label: string; accept: string; hint: string; icon: typeof ImageIcon }

> = {

  photo: { label: "Picha ya kiongozi", accept: "image/png,image/jpeg,image/webp", hint: "PNG/JPEG/WebP", icon: ImageIcon },

  signature: { label: "Saini", accept: "image/png,image/jpeg,image/webp", hint: "Picha ya saini", icon: PenLine },

  cv: { label: "Faili la CV (PDF)", accept: "application/pdf,.pdf", hint: "PDF pekee", icon: FileUp },

  cert: { label: "Cheti kilichoskan", accept: "application/pdf,image/png,image/jpeg", hint: "PDF au picha", icon: Stamp },

  attach: { label: "Kiambatanisho", accept: "application/pdf,image/*", hint: "PDF/picha", icon: FileUp },

  seal: { label: "Muhuri wa taasisi", accept: "image/png,image/jpeg,image/webp", hint: "Picha ya muhuri", icon: Stamp },

  logo: { label: "Nembo", accept: "image/png,image/jpeg,image/webp", hint: "Nembo rasmi", icon: ImageIcon },

};



type Props = {

  kinds: LeadershipUploadKind[];

  disabled?: boolean;

  busy?: boolean;

  onUpload: (

    kind: LeadershipUploadKind,

    file: File,

    onProgress?: (p: StorageUploadProgress) => void,

  ) => Promise<void>;

};



export function LeadershipDocumentUploadCenter({ kinds, disabled, busy, onUpload }: Props) {

  const refs = useRef<Partial<Record<LeadershipUploadKind, HTMLInputElement | null>>>({});

  const [active, setActive] = useState<LeadershipUploadKind | null>(null);

  const [dragOver, setDragOver] = useState<LeadershipUploadKind | null>(null);

  const [progress, setProgress] = useState<Partial<Record<LeadershipUploadKind, number>>>({});
  const [validationError, setValidationError] = useState<Partial<Record<LeadershipUploadKind, string>>>({});

  async function handleFile(kind: LeadershipUploadKind, file: File) {
    if (disabled) return;

    const guardMsg = validateLeadershipUploadFile(kind, file);
    if (guardMsg) {
      setValidationError((v) => ({ ...v, [kind]: guardMsg }));
      return;
    }
    setValidationError((v) => {
      const next = { ...v };
      delete next[kind];
      return next;
    });

    setActive(kind);

    setProgress((p) => ({ ...p, [kind]: 0 }));

    try {
      await onUpload(kind, file, (pg) => {
        setProgress((p) => ({ ...p, [kind]: pg.percent }));
      });
      setProgress((p) => ({ ...p, [kind]: 100 }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upakiaji umeshindwa.";
      setValidationError((v) => ({ ...v, [kind]: msg }));
    } finally {

      setActive(null);

      window.setTimeout(() => {

        setProgress((p) => {

          const next = { ...p };

          delete next[kind];

          return next;

        });

      }, 1200);

    }

  }



  return (

    <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm">

      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700/90">Kituo cha upakiaji</p>

      <p className="mt-1 text-xs text-slate-600">Buruta faili au bofya — ufuatiliaji wa maendeleo na uhakiki kabla ya kuhifadhi.</p>

      <motion.div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">

        {kinds.map((kind) => {

          const meta = KIND_META[kind];

          const Icon = meta.icon;

          const isBusy = (busy && active === kind) || active === kind;

          const pct = progress[kind];

          const isDrag = dragOver === kind;

          return (

            <motion.div

              key={kind}

              layout

              whileHover={{ scale: disabled ? 1 : 1.01 }}

              className={`relative rounded-xl border-2 border-dashed p-3 transition ${

                disabled

                  ? "border-slate-200 opacity-60"

                  : isDrag

                    ? "border-amber-500 bg-amber-50/80 shadow-md ring-2 ring-amber-300/50"

                    : "border-amber-300/50 bg-white hover:border-amber-400/70 hover:shadow-md"

              }`}

              onDragOver={(e) => {

                e.preventDefault();

                if (!disabled) setDragOver(kind);

              }}

              onDragLeave={() => setDragOver(null)}

              onDrop={(e) => {

                e.preventDefault();

                setDragOver(null);

                const f = e.dataTransfer.files?.[0];

                if (f) void handleFile(kind, f);

              }}

            >

              <input

                ref={(el) => {

                  refs.current[kind] = el;

                }}

                type="file"

                accept={meta.accept}

                className="sr-only"

                disabled={disabled || Boolean(active)}

                onChange={(e) => {

                  const f = e.target.files?.[0];

                  e.target.value = "";

                  if (f) void handleFile(kind, f);

                }}

              />

              <button

                type="button"

                disabled={disabled || Boolean(active)}

                onClick={() => refs.current[kind]?.click()}

                className="flex w-full flex-col items-center gap-2 text-center"

              >

                {isBusy ? (

                  <Loader2 className="h-6 w-6 animate-spin text-[#0B1F3A]" />

                ) : (

                  <Icon className="h-6 w-6 text-[#0B1F3A]/80" />

                )}

                <span className="text-xs font-semibold text-[#0B1F3A]">{meta.label}</span>

                <span className="text-[10px] text-slate-500">{meta.hint}</span>
                {validationError[kind] ? (
                  <span className="text-[10px] font-medium text-rose-700" role="alert">
                    {validationError[kind]}
                  </span>
                ) : null}

              </button>

              <AnimatePresence>

                {pct != null ? (

                  <motion.div

                    initial={{ opacity: 0, height: 0 }}

                    animate={{ opacity: 1, height: "auto" }}

                    exit={{ opacity: 0, height: 0 }}

                    className="mt-2 overflow-hidden"

                  >

                    <motion.div className="h-1.5 overflow-hidden rounded-full bg-slate-100">

                      <motion.div

                        className="h-full rounded-full bg-gradient-to-r from-[#0B1F4D] to-amber-500"

                        initial={{ width: 0 }}

                        animate={{ width: `${pct}%` }}

                        transition={{ ease: "easeOut" }}

                      />

                    </motion.div>

                    <p className="mt-1 text-center text-[9px] font-semibold text-slate-500">{Math.round(pct)}%</p>

                  </motion.div>

                ) : null}

              </AnimatePresence>

            </motion.div>

          );

        })}

      </motion.div>

    </div>

  );

}

