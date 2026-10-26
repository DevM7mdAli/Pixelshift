"use client";

import { Check, Copy } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

/** Class strings shared by every playground panel, built from the site's tokens. */
export const ui = {
  panel:
    "min-w-0 overflow-hidden rounded-xl border border-pixel-ink bg-pixel-board-surface",
  panelHeader:
    "flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-pixel-line px-4 py-2",
  overline: "text-[0.68rem] font-[760] tracking-[0.14em] uppercase",
  button:
    "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full border border-pixel-ink bg-transparent px-4 text-[0.8rem] font-[720] text-pixel-ink transition-colors duration-150 hover:bg-pixel-paper-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pixel-orange disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent",
  primary:
    "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full border border-pixel-ink bg-pixel-lime px-4 text-[0.8rem] font-[720] text-pixel-mark transition-[box-shadow] duration-150 hover:shadow-[3px_3px_0] hover:shadow-pixel-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pixel-orange disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:shadow-none",
  small:
    "inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-full border border-pixel-line px-3 text-[0.72rem] font-[720] text-pixel-ink transition-colors duration-150 hover:border-pixel-ink hover:bg-pixel-paper-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pixel-orange disabled:cursor-not-allowed disabled:opacity-45",
  field:
    "h-9 w-full min-w-0 rounded-md border border-pixel-line bg-pixel-paper px-2.5 text-[0.82rem] text-pixel-ink placeholder:text-pixel-subtle focus-visible:border-pixel-orange focus-visible:outline-2 focus-visible:outline-pixel-orange/30 disabled:opacity-50",
  mono: "font-pixel-mono text-[0.72rem]",
  code: "m-0 overflow-auto rounded-lg border border-pixel-line bg-pixel-canvas p-3 font-pixel-mono text-[0.72rem] leading-[1.7] text-pixel-ink",
} as const;

/** An accessible tab list. Arrow keys, Home, and End move between tabs. */
export function Tabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
  idPrefix,
}: {
  label: string;
  tabs: readonly { id: T; label: ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  idPrefix: string;
}) {
  const refs = useRef(new Map<T, HTMLButtonElement>());

  const onKeyDown = (event: KeyboardEvent) => {
    const index = tabs.findIndex((tab) => tab.id === value);
    const last = tabs.length - 1;
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : event.key === "ArrowLeft"
          ? (index - 1 + tabs.length) % tabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : undefined;
    if (next === undefined) return;
    event.preventDefault();
    const tab = tabs[next]!;
    onChange(tab.id);
    refs.current.get(tab.id)?.focus();
  };

  return (
    <div
      aria-label={label}
      className="flex min-w-0 gap-1 overflow-x-auto [scrollbar-width:none]"
      onKeyDown={onKeyDown}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          aria-controls={`${idPrefix}-panel-${tab.id}`}
          aria-selected={tab.id === value}
          className="h-8 shrink-0 rounded-full border border-transparent px-3.5 text-[0.78rem] font-[720] whitespace-nowrap text-pixel-muted transition-colors duration-150 hover:text-pixel-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pixel-orange aria-selected:border-pixel-ink aria-selected:bg-pixel-paper-bright aria-selected:text-pixel-ink"
          id={`${idPrefix}-tab-${tab.id}`}
          key={tab.id}
          onClick={() => onChange(tab.id)}
          ref={(node) => {
            if (node) refs.current.set(tab.id, node);
            else refs.current.delete(tab.id);
          }}
          role="tab"
          tabIndex={tab.id === value ? 0 : -1}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function CopyButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1600);
  }

  return (
    <button className={ui.small} onClick={() => void copy()} type="button">
      {state === "copied" ? (
        <Check aria-hidden="true" size={13} />
      ) : (
        <Copy aria-hidden="true" size={13} />
      )}
      <span aria-live="polite">
        {state === "copied"
          ? "Copied"
          : state === "failed"
            ? "Copy failed"
            : label}
      </span>
    </button>
  );
}

/** A labeled on/off switch. */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
  id,
}: {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      id={id}
      className="relative h-5.5 w-10 shrink-0 rounded-full border border-pixel-ink bg-transparent transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pixel-orange disabled:opacity-45 aria-checked:bg-pixel-lime"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 size-3.5 rounded-full bg-pixel-ink transition-[inset-inline-start] duration-150 motion-reduce:transition-none ${checked ? "start-5" : "start-0.5"}`}
      />
    </button>
  );
}

/** An object URL for `blob`, revoked when the blob changes or the component unmounts. */
export function useObjectUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}
