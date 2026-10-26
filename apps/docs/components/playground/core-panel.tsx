"use client";

import { Loader2, Play } from "lucide-react";
import { useRef, useState } from "react";
import {
  CORE_FUNCTIONS,
  describeFailure,
  getCoreFunction,
  parseOptions,
  runCoreFunction,
  type CoreFailure,
  type CoreOutcome,
} from "@/lib/playground/core-runner";
import { CopyButton, ui, useObjectUrl } from "./ui";

const pretty = (value: unknown) => JSON.stringify(value, null, 2);

export function CorePanel({ file }: { file: File | undefined }) {
  const [functionId, setFunctionId] = useState(CORE_FUNCTIONS[0]!.id);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<CoreOutcome>();
  const [failure, setFailure] = useState<CoreFailure>();
  const controller = useRef<AbortController>(undefined);

  const fn = getCoreFunction(functionId);
  const text = drafts[fn.id] ?? pretty(fn.defaults);
  const parsed = parseOptions(text);
  const preview = useObjectUrl(outcome?.image?.blob);

  async function run() {
    if (!file || "error" in parsed) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setRunning(true);
    setOutcome(undefined);
    setFailure(undefined);
    try {
      setOutcome(await runCoreFunction(fn, file, parsed.options, abort.signal));
    } catch (error) {
      if (!abort.signal.aborted) setFailure(describeFailure(error));
    } finally {
      if (controller.current === abort) setRunning(false);
    }
  }

  return (
    <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
      <div className="grid content-start gap-2">
        <p className="m-0 text-[0.78rem] text-pixel-muted">
          Call <code className={ui.mono}>pixelshift-core</code> directly, with
          no UI.
        </p>
        <ul
          aria-label="Core functions"
          className="m-0 grid list-none gap-1 p-0"
        >
          {CORE_FUNCTIONS.map((candidate) => (
            <li key={candidate.id}>
              <button
                aria-pressed={candidate.id === fn.id}
                className="w-full rounded-md border border-transparent px-2.5 py-1.5 text-start font-pixel-mono text-[0.74rem] text-pixel-muted transition-colors duration-150 hover:text-pixel-ink focus-visible:outline-2 focus-visible:outline-pixel-orange aria-pressed:border-pixel-ink aria-pressed:bg-pixel-paper-bright aria-pressed:text-pixel-ink"
                onClick={() => {
                  setFunctionId(candidate.id);
                  setOutcome(undefined);
                  setFailure(undefined);
                }}
                type="button"
              >
                {candidate.id}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid min-w-0 content-start gap-3">
        <p className="m-0 text-[0.82rem] leading-relaxed text-pixel-muted">
          {fn.description}{" "}
          <span className="text-pixel-subtle">
            Returns <code className={ui.mono}>{fn.returns}</code>.
          </span>
        </p>

        <label className="grid gap-1.5" htmlFor="core-options">
          <span className="flex items-center justify-between gap-2">
            <span className={`${ui.mono} font-[720]`}>options (JSON)</span>
            <button
              className={ui.small}
              onClick={() =>
                setDrafts((current) => {
                  const { [fn.id]: _removed, ...rest } = current;
                  return rest;
                })
              }
              type="button"
            >
              Reset
            </button>
          </span>
          <textarea
            aria-describedby="core-options-status"
            aria-invalid={"error" in parsed}
            className={`${ui.code} h-40 w-full resize-y whitespace-pre`}
            id="core-options"
            onChange={(event) =>
              setDrafts((current) => ({
                ...current,
                [fn.id]: event.target.value,
              }))
            }
            spellCheck={false}
            value={text}
          />
        </label>
        <p
          className={`m-0 min-h-5 text-[0.74rem] ${"error" in parsed ? "text-pixel-orange" : "text-pixel-subtle"}`}
          id="core-options-status"
          role="status"
        >
          {"error" in parsed
            ? parsed.error
            : "Valid. A signal is added so you can cancel."}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className={ui.primary}
            disabled={!file || "error" in parsed || running}
            onClick={() => void run()}
            type="button"
          >
            {running ? (
              <Loader2
                aria-hidden="true"
                className="animate-spin motion-reduce:animate-none"
                size={14}
              />
            ) : (
              <Play aria-hidden="true" size={14} />
            )}
            Run {fn.id}()
          </button>
          {running ? (
            <button
              className={ui.button}
              onClick={() => controller.current?.abort()}
              type="button"
            >
              Cancel
            </button>
          ) : null}
          {file ? (
            <span className="text-[0.74rem] text-pixel-subtle">
              on <code className={ui.mono}>{file.name}</code>
            </span>
          ) : (
            <span className="text-[0.74rem] text-pixel-orange">
              Choose a test image first.
            </span>
          )}
        </div>

        {failure ? (
          <p
            className="m-0 rounded-lg border border-pixel-orange p-3 text-[0.8rem]"
            role="alert"
          >
            {failure.code ? (
              <code className={`${ui.mono} me-2 font-[760] text-pixel-orange`}>
                {failure.code}
              </code>
            ) : null}
            {failure.message}
          </p>
        ) : null}

        {outcome ? (
          <div className="grid gap-3 rounded-lg border border-pixel-line p-3">
            <dl className="m-0 grid gap-1.5 text-[0.78rem]">
              {outcome.stats.map(([label, value]) => (
                <div
                  className="grid grid-cols-[6rem_minmax(0,1fr)] gap-2"
                  key={label}
                >
                  <dt className="text-pixel-subtle">{label}</dt>
                  <dd className="m-0 min-w-0 break-words">{value}</dd>
                </div>
              ))}
            </dl>
            {preview ? (
              <img
                alt={`Result of ${fn.id}`}
                className="max-h-72 w-full rounded-md border border-pixel-line bg-[conic-gradient(var(--pixelshift-canvas)_25%,transparent_0_50%,var(--pixelshift-canvas)_0_75%,transparent_0)] bg-size-[16px_16px] object-contain"
                src={preview}
              />
            ) : null}
            {outcome.palette ? (
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {outcome.palette.map((color) => (
                  <li
                    className="flex items-center gap-2 rounded-md border border-pixel-line py-1 ps-1 pe-2.5"
                    key={color.hex}
                  >
                    <span
                      aria-hidden="true"
                      className="size-6 rounded-sm border border-pixel-line"
                      style={{ background: color.hex }}
                    />
                    <span className={ui.mono}>{color.hex}</span>
                    <span className="text-[0.7rem] text-pixel-subtle">
                      {color.share}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {outcome.text ? (
              <pre className={`${ui.code} whitespace-pre-wrap break-all`}>
                <code>{outcome.text}</code>
              </pre>
            ) : null}
            <details>
              <summary className="cursor-pointer text-[0.76rem] font-[720]">
                Raw result
              </summary>
              <pre className={`${ui.code} mt-2 max-h-64`}>
                <code>{pretty(outcome.json)}</code>
              </pre>
            </details>
          </div>
        ) : null}

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className={`${ui.mono} font-[720]`}>Equivalent code</span>
            <CopyButton
              text={"error" in parsed ? "" : fn.source(parsed.options)}
            />
          </div>
          <pre className={ui.code}>
            <code>
              {"error" in parsed
                ? "// Fix the options JSON to see the call."
                : fn.source(parsed.options)}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}
