"use client";

import { CircleAlert, CircleCheck, Loader2, Play } from "lucide-react";
import { useState } from "react";
import {
  runSmokeTest,
  type SmokeStep,
  type SmokeTarget,
} from "@/lib/playground/smoke";
import { ui } from "./ui";

interface MethodsPanelProps {
  /** The element, or the active tool inside the studio. */
  target: SmokeTarget | null;
  staged: File[];
  isStudio: boolean;
  /** Called after anything that may change `files` or `results`. */
  onChanged: () => void;
}

interface CallRecord {
  call: string;
  ok: boolean;
  detail: string;
  ms: number;
}

export function MethodsPanel({
  target,
  staged,
  isStudio,
  onChanged,
}: MethodsPanelProps) {
  const [last, setLast] = useState<CallRecord>();
  const [busy, setBusy] = useState(false);
  const [smoke, setSmoke] = useState<SmokeStep[]>();
  const disabled = !target;

  /** Runs a method, records what it returned or threw, and refreshes the readouts. */
  async function call(name: string, run: () => unknown) {
    const started = performance.now();
    setBusy(true);
    try {
      const value = await run();
      setLast({
        call: name,
        ok: true,
        detail: describeReturn(value),
        ms: performance.now() - started,
      });
    } catch (error) {
      setLast({
        call: name,
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
        ms: performance.now() - started,
      });
    } finally {
      setBusy(false);
      onChanged();
    }
  }

  async function smokeTest() {
    if (!target) return;
    setBusy(true);
    setSmoke(undefined);
    try {
      setSmoke(await runSmokeTest(target, staged));
    } finally {
      setBusy(false);
      // Leave the preview showing the staged images again.
      if (staged.length) target.loadFiles(staged);
      onChanged();
    }
  }

  const files = target?.files ?? [];
  const results = target?.results ?? [];

  return (
    <div className="grid gap-5 p-4 lg:grid-cols-2">
      <div className="grid content-start gap-4">
        <p className="m-0 text-[0.82rem] leading-relaxed text-pixel-muted">
          Call the element&rsquo;s public API from outside, the way your app
          would.
          {isStudio ? " On the studio these act on the active tool." : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            className={ui.button}
            disabled={disabled || busy || staged.length === 0}
            onClick={() =>
              void call("loadFiles(files)", () => target!.loadFiles(staged))
            }
            title={staged.length ? undefined : "Choose a test image first"}
            type="button"
          >
            loadFiles(files)
          </button>
          <button
            className={ui.primary}
            disabled={disabled || busy}
            onClick={() => void call("process()", () => target!.process())}
            type="button"
          >
            process()
          </button>
          <button
            className={ui.button}
            disabled={disabled}
            onClick={() => void call("cancel()", () => target!.cancel())}
            type="button"
          >
            cancel()
          </button>
          <button
            className={ui.button}
            disabled={disabled || busy}
            onClick={() => void call("reset()", () => target!.reset())}
            type="button"
          >
            reset()
          </button>
        </div>

        <dl className="m-0 grid gap-2 rounded-lg border border-pixel-line p-3 text-[0.78rem]">
          <Readout label="files">
            {files.length === 0
              ? "none"
              : files.map((file) => file.name).join(", ")}
          </Readout>
          <Readout label="results">{results.length}</Readout>
          <Readout label="last call">
            {last ? (
              <span className={last.ok ? "" : "text-pixel-orange"}>
                <code className={ui.mono}>{last.call}</code> → {last.detail}
                <span className="text-pixel-subtle">
                  {" "}
                  · {Math.round(last.ms)} ms
                </span>
              </span>
            ) : (
              "—"
            )}
          </Readout>
        </dl>
      </div>

      <div className="grid content-start gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="m-0 text-[0.85rem] font-[760]">Smoke test</h3>
          <button
            className={ui.small}
            disabled={disabled || busy || staged.length === 0}
            onClick={() => void smokeTest()}
            type="button"
          >
            {busy ? (
              <Loader2
                aria-hidden="true"
                className="animate-spin motion-reduce:animate-none"
                size={12}
              />
            ) : (
              <Play aria-hidden="true" size={12} />
            )}
            Run
          </button>
        </div>
        <p className="m-0 text-[0.78rem] leading-relaxed text-pixel-muted">
          Loads the staged images and checks six guarantees every element makes,
          reporting each one.
        </p>
        {smoke ? (
          <ol className="m-0 grid list-none gap-1.5 p-0" aria-live="polite">
            {smoke.map((step) => (
              <li
                className="flex items-start gap-2 rounded-md border border-pixel-line px-2.5 py-2 text-[0.78rem]"
                key={step.name}
              >
                {step.ok ? (
                  <CircleCheck
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-pixel-success"
                    size={14}
                  />
                ) : (
                  <CircleAlert
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-pixel-orange"
                    size={14}
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block">{step.name}</span>
                  {step.ok ? null : (
                    <span className="block text-pixel-orange">
                      {step.detail}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-pixel-mono text-[0.68rem] text-pixel-subtle tabular-nums">
                  {Math.round(step.ms)} ms
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </div>
  );
}

function Readout({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
      <dt className="text-pixel-subtle">{label}</dt>
      <dd className="m-0 min-w-0 break-words">{children}</dd>
    </div>
  );
}

function describeReturn(value: unknown): string {
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) {
    const sizes = value
      .map((item) => (item as { convertedSize?: number })?.convertedSize)
      .filter((size): size is number => typeof size === "number");
    return `${value.length} result${value.length === 1 ? "" : "s"}${
      sizes.length
        ? ` (${sizes.map((size) => `${(size / 1024).toFixed(1)} KB`).join(", ")})`
        : ""
    }`;
  }
  return String(value);
}
