import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearExpiredPortalDrafts,
  clearPortalDraft,
  isSensitiveDraftControl,
  portalDraftScopeKey,
  PORTAL_DRAFT_EVENT_CLEAR_CURRENT,
  PORTAL_DRAFT_EVENT_FLUSH,
  PORTAL_DRAFT_EVENT_OFFICIAL_SAVE,
  readPortalDraft,
  truncateDraftValue,
  writePortalDraft,
  type PortalDraftField,
  type PortalDraftScope,
  type PortalDraftUiState,
} from "../../lib/portalDraftRecovery";

type DraftStatus = "idle" | "dirty" | "saving" | "saved" | "restored";

interface Props {
  scope: PortalDraftScope;
  rootId: string;
  enabled?: boolean;
}

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value);
  return value.replace(/["\\]/g, "\\$&");
}

function elementPath(el: Element, root: HTMLElement): string {
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && cur !== root && parts.length < 6) {
    const parent: HTMLElement | null = cur.parentElement;
    if (!parent) break;
    const tag = cur.tagName.toLowerCase();
    const sameTag = Array.from(parent.children).filter((child): child is Element => child.tagName === cur?.tagName);
    const idx = Math.max(0, sameTag.indexOf(cur)) + 1;
    parts.unshift(`${tag}:nth-of-type(${idx})`);
    cur = parent;
  }
  return parts.join(">");
}

function stableSelector(el: HTMLElement, root: HTMLElement): string {
  const draftKey = el.getAttribute("data-draft-key");
  if (draftKey) return `[data-draft-key="${cssEscape(draftKey)}"]`;
  const name = (el as HTMLInputElement).name;
  if (name) return `${el.tagName.toLowerCase()}[name="${cssEscape(name)}"]`;
  if (el.id) return `#${cssEscape(el.id)}`;
  const aria = el.getAttribute("aria-label");
  if (aria) return `${el.tagName.toLowerCase()}[aria-label="${cssEscape(aria)}"]`;
  const placeholder = el.getAttribute("placeholder");
  if (placeholder) return `${el.tagName.toLowerCase()}[placeholder="${cssEscape(placeholder)}"]`;
  return elementPath(el, root);
}

function draftKeyFor(el: HTMLElement, root: HTMLElement): string {
  return [el.tagName.toLowerCase(), stableSelector(el, root), (el as HTMLInputElement).type || ""].join("|");
}

function isDraftableControl(el: Element): el is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) return false;
  if (el.disabled) return false;
  if ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && el.readOnly) return false;
  if (isSensitiveDraftControl(el)) return false;
  if (el instanceof HTMLInputElement) {
    return !["hidden", "password", "button", "submit", "reset", "image"].includes(el.type);
  }
  return true;
}

function serializeRoot(root: HTMLElement): { fields: PortalDraftField[]; ui: PortalDraftUiState } {
  const fields: PortalDraftField[] = [];
  const seen = new Set<string>();

  root.querySelectorAll("input, textarea, select, [contenteditable='true']").forEach((el) => {
    if (el instanceof HTMLElement && isSensitiveDraftControl(el)) return;
    if (isDraftableControl(el)) {
      const selector = stableSelector(el, root);
      const key = draftKeyFor(el, root);
      if (seen.has(key)) return;
      seen.add(key);
      if (el instanceof HTMLInputElement && el.type === "file") {
        const fileMeta = Array.from(el.files ?? []).map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
        }));
        fields.push({ key, selector, kind: "file", fileMeta });
        return;
      }
      if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
        fields.push({ key, selector, kind: el.type, checked: el.checked, value: truncateDraftValue(el.value ?? "") });
        return;
      }
      if (el instanceof HTMLSelectElement) {
        fields.push({
          key,
          selector,
          kind: "select",
          selectedValues: Array.from(el.selectedOptions).map((option) => truncateDraftValue(option.value)),
        });
        return;
      }
      fields.push({
        key,
        selector,
        kind: el instanceof HTMLTextAreaElement ? "textarea" : "input",
        value: truncateDraftValue(el.value ?? ""),
      });
      return;
    }
    if (el instanceof HTMLElement && el.isContentEditable) {
      const selector = stableSelector(el, root);
      const key = draftKeyFor(el, root);
      fields.push({ key, selector, kind: "contenteditable", value: truncateDraftValue(el.textContent ?? "") });
    }
  });

  const scrollParent = document.getElementById("portal-main-scroll");
  const active = document.activeElement instanceof HTMLElement && root.contains(document.activeElement)
    ? draftKeyFor(document.activeElement, root)
    : null;

  return {
    fields,
    ui: {
      scrollTop: scrollParent?.scrollTop ?? root.scrollTop ?? 0,
      activeElementKey: active,
      openDetails: Array.from(root.querySelectorAll("details[open]")).map((el) => stableSelector(el as HTMLElement, root)),
    },
  };
}

function dispatchNativeChange(el: Element): void {
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function setInputValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, value);
}

function applyField(root: HTMLElement, field: PortalDraftField): boolean {
  const el = root.querySelector(field.selector);
  if (!el || !(el instanceof HTMLElement) || isSensitiveDraftControl(el)) return false;
  if (field.kind === "file") return Boolean(field.fileMeta?.length);
  if (el instanceof HTMLInputElement && (field.kind === "checkbox" || field.kind === "radio")) {
    el.checked = Boolean(field.checked);
    dispatchNativeChange(el);
    return true;
  }
  if (el instanceof HTMLSelectElement && field.kind === "select") {
    const selected = new Set(field.selectedValues ?? []);
    Array.from(el.options).forEach((option) => {
      option.selected = selected.has(option.value);
    });
    dispatchNativeChange(el);
    return true;
  }
  if ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && typeof field.value === "string") {
    setInputValue(el, field.value);
    dispatchNativeChange(el);
    return true;
  }
  if (field.kind === "contenteditable" && typeof field.value === "string") {
    el.textContent = field.value;
    dispatchNativeChange(el);
    return true;
  }
  return false;
}

export function PortalAutoDraftRecovery({ scope, rootId, enabled = true }: Props) {
  const [status, setStatus] = useState<DraftStatus>("idle");
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoringRef = useRef(false);
  const scopeKey = useMemo(() => portalDraftScopeKey(scope), [scope]);

  const showTransientStatus = useCallback((next: DraftStatus, ms = 3200) => {
    setStatus(next);
    if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current);
    statusTimerRef.current = window.setTimeout(() => setStatus("idle"), ms);
  }, []);

  const saveNow = useCallback(
    (nextStatus: DraftStatus = "saved") => {
      if (!enabled || restoringRef.current) return false;
      const root = document.getElementById(rootId);
      if (!root) return false;
      const serialized = serializeRoot(root);
      const saved = writePortalDraft(scope, serialized.fields, serialized.ui);
      if (saved) showTransientStatus(nextStatus, nextStatus === "saving" ? 1200 : 2800);
      return saved;
    },
    [enabled, rootId, scope, showTransientStatus]
  );

  const scheduleSave = useCallback(() => {
    if (!enabled || restoringRef.current) return;
    setStatus("dirty");
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      setStatus("saving");
      window.setTimeout(() => saveNow("saved"), 80);
    }, 1300);
  }, [enabled, saveNow]);

  useEffect(() => {
    clearExpiredPortalDrafts();
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const root = document.getElementById(rootId);
    if (!root) return;

    const restore = () => {
      const draft = readPortalDraft(scope);
      if (!draft) return false;
      restoringRef.current = true;
      let applied = 0;
      try {
        draft.ui.openDetails.forEach((selector) => {
          const details = root.querySelector(selector);
          if (details instanceof HTMLDetailsElement) details.open = true;
        });
        draft.fields.forEach((field) => {
          if (applyField(root, field)) applied += 1;
        });
        const scrollParent = document.getElementById("portal-main-scroll");
        if (scrollParent && draft.ui.scrollTop > 0) {
          requestAnimationFrame(() => {
            scrollParent.scrollTop = draft.ui.scrollTop;
          });
        }
      } catch {
        clearPortalDraft(scope);
      } finally {
        window.setTimeout(() => {
          restoringRef.current = false;
        }, 120);
      }
      if (applied > 0) showTransientStatus("restored", 4200);
      return applied > 0;
    };

    const t1 = window.setTimeout(restore, 120);
    const t2 = window.setTimeout(restore, 650);
    const observer = new MutationObserver(() => {
      if (!restoringRef.current) restore();
    });
    observer.observe(root, { childList: true, subtree: true });
    const stopObserver = window.setTimeout(() => observer.disconnect(), 7000);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(stopObserver);
      observer.disconnect();
    };
  }, [enabled, rootId, scope, scopeKey, showTransientStatus]);

  useEffect(() => {
    if (!enabled) return;
    const root = document.getElementById(rootId);
    if (!root) return;
    const onInput = () => scheduleSave();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") saveNow("saved");
    };
    const onBeforeUnload = (ev: BeforeUnloadEvent) => {
      if (!saveNow("saved")) return;
      ev.preventDefault();
      ev.returnValue = "Una mabadiliko ambayo hayajahifadhiwa. Unataka kuondoka?";
    };
    const onFlush = () => {
      saveNow("saved");
    };
    const onClear = () => {
      clearPortalDraft(scope);
      setStatus("idle");
    };
    root.addEventListener("input", onInput, true);
    root.addEventListener("change", onInput, true);
    root.addEventListener("toggle", onInput, true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener(PORTAL_DRAFT_EVENT_FLUSH, onFlush);
    window.addEventListener(PORTAL_DRAFT_EVENT_CLEAR_CURRENT, onClear);
    window.addEventListener(PORTAL_DRAFT_EVENT_OFFICIAL_SAVE, onClear);
    return () => {
      root.removeEventListener("input", onInput, true);
      root.removeEventListener("change", onInput, true);
      root.removeEventListener("toggle", onInput, true);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener(PORTAL_DRAFT_EVENT_FLUSH, onFlush);
      window.removeEventListener(PORTAL_DRAFT_EVENT_CLEAR_CURRENT, onClear);
      window.removeEventListener(PORTAL_DRAFT_EVENT_OFFICIAL_SAVE, onClear);
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current);
    };
  }, [enabled, rootId, saveNow, scheduleSave, scope]);

  if (status === "idle") return null;

  const label =
    status === "dirty"
      ? "Mabadiliko hayajahifadhiwa"
      : status === "saving"
        ? "Inaifadhi rasimu..."
        : status === "restored"
          ? "Rasimu imerejeshwa"
          : "Rasimu imehifadhiwa";

  return (
    <div
      className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-3 z-[260] rounded-2xl border border-white/70 bg-[#0B1F3A]/95 px-3 py-2 text-xs font-semibold text-white shadow-2xl backdrop-blur md:right-5"
      role="status"
      aria-live="polite"
    >
      {label}
    </div>
  );
}
