/**
 * A scripted tour of the public API every Pixelshift element shares, run from
 * outside the element exactly as an application would call it.
 */

export interface SmokeTarget extends HTMLElement {
  files: readonly File[];
  results: readonly unknown[];
  loadFiles(files: readonly File[]): void;
  process(): Promise<unknown[]>;
  cancel(): void;
  reset(): void;
}

export interface SmokeStep {
  name: string;
  ok: boolean;
  detail: string;
  ms: number;
}

const WATCHED = [
  "files-selected",
  "process-start",
  "process-complete",
] as const;

/**
 * Runs six checks against `target` and reports each. Never throws: a thrown
 * error becomes a failed step, and the remaining steps are skipped.
 */
export async function runSmokeTest(
  target: SmokeTarget,
  files: readonly File[],
): Promise<SmokeStep[]> {
  const steps: SmokeStep[] = [];
  const seen: Record<string, number> = {};
  const listeners = WATCHED.map((name) => {
    const listener = () => (seen[name] = (seen[name] ?? 0) + 1);
    target.addEventListener(name, listener);
    return [name, listener] as const;
  });

  const check = async (
    name: string,
    run: () => Promise<string | true> | string | true,
  ): Promise<boolean> => {
    const started = performance.now();
    try {
      const outcome = await run();
      steps.push({
        name,
        ok: outcome === true,
        detail: outcome === true ? "ok" : outcome,
        ms: performance.now() - started,
      });
      return outcome === true;
    } catch (error) {
      steps.push({
        name,
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
        ms: performance.now() - started,
      });
      return false;
    }
  };

  try {
    const count = Math.min(files.length, 3);
    const input = files.slice(0, count);

    // The base class keeps one file unless `multiple` is set, so compare
    // against what the element actually accepted.
    let accepted = 0;
    let ok = await check("loadFiles(files) stages the files", () => {
      target.loadFiles(input);
      accepted = target.files.length;
      if (accepted < 1) return `files.length is ${accepted}`;
      if (!seen["files-selected"]) return "files-selected was not fired";
      return true;
    });

    ok =
      ok &&
      (await check("process() resolves one result per file", async () => {
        const results = await target.process();
        if (results.length !== accepted) {
          return `resolved ${results.length} results for ${accepted} files`;
        }
        if (!seen["process-start"]) return "process-start was not fired";
        if (!seen["process-complete"]) return "process-complete was not fired";
        return true;
      }));

    ok =
      ok &&
      (await check("results matches what process() resolved", () =>
        target.results.length === accepted
          ? true
          : `results.length is ${target.results.length}`,
      ));

    ok =
      ok &&
      (await check("a second process() while busy resolves []", async () => {
        const first = target.process();
        const second = await target.process();
        const done = await first;
        if (second.length !== 0) return `second call resolved ${second.length}`;
        return done.length === accepted
          ? true
          : `first call resolved ${done.length}`;
      }));

    ok =
      ok &&
      (await check("cancel() discards a running batch", async () => {
        const before = seen["process-complete"] ?? 0;
        const run = target.process();
        target.cancel();
        const results = await run;
        if (results.length !== 0) return `resolved ${results.length} results`;
        return (seen["process-complete"] ?? 0) === before
          ? true
          : "process-complete fired for a cancelled batch";
      }));

    if (ok) {
      await check("reset() clears files and results", () => {
        target.reset();
        return target.files.length === 0 && target.results.length === 0
          ? true
          : `files ${target.files.length}, results ${target.results.length}`;
      });
    }
  } finally {
    for (const [name, listener] of listeners) {
      target.removeEventListener(name, listener);
    }
  }
  return steps;
}
