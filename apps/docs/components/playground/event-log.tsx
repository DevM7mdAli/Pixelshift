"use client";

import { ui } from "./ui";

export interface LogEntry {
  id: number;
  at: number;
  name: string;
  summary: string;
}

const tone: Record<string, string> = {
  "process-error": "text-pixel-orange",
  "conversion-error": "text-pixel-orange",
  "process-complete": "text-pixel-success",
  "conversion-complete": "text-pixel-success",
};

export function EventLog({
  entries,
  onClear,
}: {
  entries: LogEntry[];
  onClear: () => void;
}) {
  const start = entries.at(-1)?.at ?? 0;

  return (
    <div className="grid gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-[0.82rem] text-pixel-muted">
          Every event the element fires, newest first.
          <span className="ms-1 font-pixel-mono text-pixel-subtle">
            {entries.length} logged
          </span>
        </p>
        <button
          className={ui.small}
          disabled={entries.length === 0}
          onClick={onClear}
          type="button"
        >
          Clear
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="m-0 rounded-lg border border-dashed border-pixel-line p-6 text-center text-[0.82rem] text-pixel-subtle">
          Nothing yet. Pick a test image or press <code>process()</code>.
        </p>
      ) : (
        <ol
          aria-label="Event log"
          className="m-0 max-h-80 list-none overflow-auto rounded-lg border border-pixel-line p-0"
        >
          {entries.map((entry) => (
            <li
              className="grid grid-cols-[4.5rem_11.5rem_minmax(0,1fr)] items-baseline gap-3 border-b border-pixel-line px-3 py-1.5 last:border-b-0 max-[700px]:grid-cols-1 max-[700px]:gap-0"
              key={entry.id}
            >
              <span className={`${ui.mono} text-pixel-subtle tabular-nums`}>
                +{((entry.at - start) / 1000).toFixed(2)}s
              </span>
              <code
                className={`${ui.mono} font-[720] ${tone[entry.name] ?? ""}`}
              >
                {entry.name}
              </code>
              <span className="min-w-0 break-words text-[0.78rem] text-pixel-muted">
                {entry.summary}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
