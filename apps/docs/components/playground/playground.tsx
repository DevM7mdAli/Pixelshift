"use client";

import { useTheme } from "fumadocs-ui/provider/base";
import { Link2, Upload, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { generateCode, type PropValue } from "@/lib/playground/code";
import { readAttributes, readDefaults } from "@/lib/playground/element";
import { EVENT_NAMES, summarizeDetail } from "@/lib/playground/events";
import { SAMPLES, loadSample } from "@/lib/playground/samples";
import {
  DEFAULT_TOOL,
  TOOLS,
  controlsFor,
  getTool,
} from "@/lib/playground/schema";
import type { SmokeTarget } from "@/lib/playground/smoke";
import { CodePanel } from "./code-panel";
import { CorePanel } from "./core-panel";
import { EventLog, type LogEntry } from "./event-log";
import { MethodsPanel } from "./methods-panel";
import { PropControls } from "./prop-controls";
import { CopyButton, Tabs, ui } from "./ui";

/** An element, or (for the studio) the tool currently inside it. */
type ToolElement = HTMLElement &
  Partial<Omit<SmokeTarget, keyof HTMLElement>> & {
    activeTool?: SmokeTarget | null;
    multiple?: boolean;
    updateComplete?: Promise<unknown>;
  };

interface Staged {
  id: string;
  file: File;
  source: "sample" | "upload";
}

type PageLanguage = "auto" | "ltr" | "rtl";

const PAGE_LANGUAGES = [
  { id: "auto", label: "Default" },
  { id: "ltr", label: "English · LTR" },
  { id: "rtl", label: "العربية · RTL" },
] as const;

const WORKBENCH_TABS = [
  { id: "methods", label: "Methods" },
  { id: "events", label: "Events" },
  { id: "code", label: "Code" },
  { id: "core", label: "Core API" },
] as const;

type Workbench = (typeof WORKBENCH_TABS)[number]["id"];

/** The sample each tool is easiest to judge with. */
const RECOMMENDED: Record<string, string> = {
  compress: "photo",
  resize: "photo",
  convert: "logo",
  crop: "photo",
  colors: "photo",
  base64: "logo",
  social: "photo",
  youtube: "large",
  background: "product",
  studio: "photo",
};

const NO_OVERRIDES: Record<string, PropValue> = {};
const MAX_LOG = 200;

export function Playground() {
  const { resolvedTheme } = useTheme();
  const [library, setLibrary] = useState<typeof import("pixelshift-react")>();
  const [loadError, setLoadError] = useState(false);
  const [toolId, setToolId] = useState(DEFAULT_TOOL);
  const [allOverrides, setAllOverrides] = useState<
    Record<string, Record<string, PropValue>>
  >({});
  const [pageLanguage, setPageLanguage] = useState<PageLanguage>("auto");
  const [element, setElement] = useState<ToolElement | null>(null);
  const [staged, setStaged] = useState<Staged[]>([]);
  const [workbench, setWorkbench] = useState<Workbench>("methods");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [shareUrl, setShareUrl] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((tick) => tick + 1), []);
  const darkTouched = useRef(false);
  const logId = useRef(0);

  const tool = getTool(toolId);
  const controls = useMemo(() => controlsFor(tool), [tool]);
  const overrides = allOverrides[toolId] ?? NO_OVERRIDES;

  // The library registers every element on import.
  useEffect(() => {
    let active = true;
    import("pixelshift-react")
      .then((module) => {
        if (!active) return;
        module.registerLocale("ar", module.ar);
        setLibrary(module);
      })
      .catch(() => active && setLoadError(true));
    return () => {
      active = false;
    };
  }, []);

  // Defaults and attribute names come from the live element class.
  const meta = useMemo(() => {
    if (!library) return undefined;
    const keys = controls.map((control) => control.key);
    return {
      defaults: readDefaults(tool.tag, keys),
      attributes: readAttributes(tool.tag, keys),
    };
  }, [library, tool, controls]);

  // Restore state from the URL once.
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const requested = params.get("tool");
    if (requested && TOOLS.some((candidate) => candidate.id === requested)) {
      setToolId(requested);
      try {
        const parsed: unknown = JSON.parse(params.get("p") ?? "{}");
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const allowed = new Set(
            controlsFor(getTool(requested)).map((c) => c.key),
          );
          const restored = Object.fromEntries(
            Object.entries(parsed).filter(
              ([key, value]) =>
                allowed.has(key) &&
                ["string", "number", "boolean"].includes(typeof value),
            ),
          ) as Record<string, PropValue>;
          if ("isDarkMode" in restored) darkTouched.current = true;
          setAllOverrides({ [requested]: restored });
        }
      } catch {
        // A malformed link falls back to defaults.
      }
    }
    const language = params.get("lang");
    if (language === "ltr" || language === "rtl") setPageLanguage(language);
    setHydrated(true);
  }, []);

  // Keep the URL in step so any state can be shared.
  useEffect(() => {
    if (!hydrated) return;
    const params = new URLSearchParams({ tool: toolId });
    if (pageLanguage !== "auto") params.set("lang", pageLanguage);
    if (Object.keys(overrides).length)
      params.set("p", JSON.stringify(overrides));
    const hash = `#${params.toString()}`;
    window.history.replaceState(null, "", hash);
    setShareUrl(window.location.href);
  }, [hydrated, toolId, overrides, pageLanguage]);

  // Follow the site theme until the user flips the prop themselves.
  useEffect(() => {
    if (!hydrated || darkTouched.current) return;
    const dark = resolvedTheme === "dark";
    setAllOverrides((current) => {
      const next = { ...(current[toolId] ?? {}) };
      if (dark) next.isDarkMode = true;
      else delete next.isDarkMode;
      return { ...current, [toolId]: next };
    });
  }, [hydrated, resolvedTheme, toolId]);

  // Apply the props to the element.
  useEffect(() => {
    if (!element || !meta) return;
    const target = element as unknown as Record<string, unknown>;
    for (const { key } of controls) {
      target[key] = key in overrides ? overrides[key] : meta.defaults[key];
    }
  }, [element, meta, controls, overrides]);

  // Log every event the element fires.
  useEffect(() => {
    if (!element) return;
    const listeners = EVENT_NAMES.map((name) => {
      const listener = (event: Event) => {
        const entry: LogEntry = {
          id: (logId.current += 1),
          at: performance.now(),
          name,
          summary: summarizeDetail(name, (event as CustomEvent).detail),
        };
        setLog((current) => [entry, ...current].slice(0, MAX_LOG));
      };
      element.addEventListener(name, listener);
      return [name, listener] as const;
    });
    return () => {
      for (const [name, listener] of listeners) {
        element.removeEventListener(name, listener);
      }
    };
  }, [element]);

  /** The element, or the active tool when `host` is the studio. */
  const targetOf = useCallback(
    (
      host: ToolElement | null,
    ): (SmokeTarget & { multiple?: boolean }) | null => {
      const inner = host?.activeTool ?? host;
      return inner && typeof inner.loadFiles === "function"
        ? (inner as SmokeTarget & { multiple?: boolean })
        : null;
    },
    [],
  );

  // Keep the element's files in step with the staged images.
  const multiple = overrides.multiple ?? meta?.defaults.multiple;
  useEffect(() => {
    if (!element) return;
    let active = true;
    // The studio only has an active tool once it has rendered.
    void Promise.resolve(element.updateComplete).then(() => {
      const target = targetOf(element);
      if (!active || !target) return;
      if (staged.length) target.loadFiles(staged.map((item) => item.file));
      else target.reset();
      bump();
    });
    return () => {
      active = false;
    };
    // `multiple` decides how many staged files the element keeps.
  }, [element, staged, multiple, targetOf, bump]);

  // Stage the recommended sample whenever the tool changes, unless the user
  // uploaded their own image.
  useEffect(() => {
    if (!hydrated) return;
    let active = true;
    const id = RECOMMENDED[toolId] ?? "photo";
    void loadSample(id).then((file) => {
      if (!active) return;
      setStaged((current) =>
        current.some((item) => item.source === "upload")
          ? current
          : [{ id, file, source: "sample" }],
      );
    });
    return () => {
      active = false;
    };
  }, [hydrated, toolId]);

  function setProp(key: string, value: PropValue) {
    if (key === "isDarkMode") darkTouched.current = true;
    setAllOverrides((current) => {
      const next = { ...(current[toolId] ?? {}) };
      if (value === undefined || value === meta?.defaults[key])
        delete next[key];
      else next[key] = value;
      return { ...current, [toolId]: next };
    });
  }

  function resetAll() {
    darkTouched.current = false;
    setAllOverrides((current) => ({ ...current, [toolId]: {} }));
  }

  async function toggleSample(id: string) {
    const many = targetOf(element)?.multiple === true;
    if (staged.some((item) => item.id === id)) {
      setStaged((current) => current.filter((item) => item.id !== id));
      return;
    }
    const file = await loadSample(id);
    const item: Staged = { id, file, source: "sample" };
    setStaged((current) => (many ? [...current, item] : [item]));
  }

  function onUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setStaged(
      files.map((file) => ({
        id: `upload:${file.name}:${file.size}`,
        file,
        source: "upload",
      })),
    );
  }

  const code = useMemo(
    () =>
      generateCode({
        tool,
        controls,
        overrides,
        attributes: meta?.attributes ?? {},
      }),
    [tool, controls, overrides, meta],
  );

  const target = targetOf(element);
  const dirAttributes =
    pageLanguage === "rtl"
      ? { dir: "rtl", lang: "ar" }
      : pageLanguage === "ltr"
        ? { dir: "ltr", lang: "en" }
        : {};

  if (loadError) {
    return (
      <p
        className="m-0 rounded-xl border border-pixel-orange p-6 text-[0.9rem]"
        role="alert"
      >
        The playground could not load the Pixelshift library. Reload the page to
        try again.
      </p>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <Tabs
          idPrefix="tool"
          label="Tool"
          onChange={(id) => {
            setToolId(id);
            setLog([]);
          }}
          tabs={TOOLS.map((candidate) => ({
            id: candidate.id,
            label: candidate.label,
          }))}
          value={toolId}
        />
        <CopyButton label="Copy link" text={shareUrl} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 gap-6">
          <section aria-labelledby="preview-heading" className={ui.panel}>
            <div className={ui.panelHeader}>
              <div className="min-w-0">
                <h2 className={`${ui.overline} m-0`} id="preview-heading">
                  Preview
                </h2>
                <p className="m-0 mt-0.5 truncate font-pixel-mono text-[0.72rem] text-pixel-subtle">
                  &lt;{tool.tag}&gt; · {tool.summary}
                </p>
              </div>
              <PageLanguagePicker
                onChange={setPageLanguage}
                value={pageLanguage}
              />
            </div>
            <div className="min-h-80 min-w-0 bg-[linear-gradient(90deg,var(--pixelshift-canvas-grid)_1px,transparent_1px),linear-gradient(var(--pixelshift-canvas-grid)_1px,transparent_1px)] bg-pixel-canvas bg-size-[22px_22px] p-[clamp(0.75rem,3vw,2rem)]">
              {library ? (
                <ToolHost
                  attributes={dirAttributes}
                  key={tool.tag}
                  onElement={setElement}
                  tag={tool.tag}
                />
              ) : (
                <p
                  className="m-0 flex min-h-60 items-center justify-center text-[0.85rem] font-bold"
                  role="status"
                >
                  Loading the image tools…
                </p>
              )}
            </div>
          </section>

          <TestImages
            onToggle={(id) => void toggleSample(id)}
            onUpload={onUpload}
            staged={staged}
          />

          <section aria-label="Workbench" className={ui.panel}>
            <div className="border-b border-pixel-line px-3 py-2">
              <Tabs
                idPrefix="workbench"
                label="Workbench"
                onChange={setWorkbench}
                tabs={WORKBENCH_TABS.map((tab) => ({
                  id: tab.id,
                  label:
                    tab.id === "events" && log.length
                      ? `Events (${log.length})`
                      : tab.label,
                }))}
                value={workbench}
              />
            </div>
            <div
              aria-labelledby={`workbench-tab-${workbench}`}
              id={`workbench-panel-${workbench}`}
              role="tabpanel"
            >
              {workbench === "methods" ? (
                <MethodsPanel
                  isStudio={tool.id === "studio"}
                  onChanged={bump}
                  staged={staged.map((item) => item.file)}
                  target={target}
                />
              ) : null}
              {workbench === "events" ? (
                <EventLog entries={log} onClear={() => setLog([])} />
              ) : null}
              {workbench === "code" ? (
                <CodePanel
                  changed={Object.keys(overrides).length}
                  code={code}
                />
              ) : null}
              {workbench === "core" ? (
                <CorePanel file={staged[0]?.file} />
              ) : null}
            </div>
          </section>
        </div>

        <div className="min-w-0 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:rounded-xl">
          {meta ? (
            <PropControls
              controls={controls}
              defaults={meta.defaults}
              onChange={setProp}
              onResetAll={resetAll}
              overrides={overrides}
            />
          ) : (
            <div className={`${ui.panel} p-4 text-[0.82rem] text-pixel-subtle`}>
              Reading the element&rsquo;s defaults…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Mounts one custom element and hands it to the parent. */
function ToolHost({
  tag,
  attributes,
  onElement,
}: {
  tag: string;
  attributes: Record<string, string>;
  onElement: (element: ToolElement | null) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const created = document.createElement(tag) as ToolElement;
    holder.current?.append(created);
    onElement(created);
    return () => {
      created.remove();
      onElement(null);
    };
  }, [tag, onElement]);

  return (
    <div
      className="mx-auto w-full min-w-0 max-w-215"
      ref={holder}
      {...attributes}
    />
  );
}

function PageLanguagePicker({
  value,
  onChange,
}: {
  value: PageLanguage;
  onChange: (value: PageLanguage) => void;
}) {
  return (
    <div
      aria-label="Page language and direction"
      className="flex items-center gap-1 rounded-full border border-pixel-line p-0.5"
      role="group"
    >
      {PAGE_LANGUAGES.map((option) => (
        <button
          aria-pressed={value === option.id}
          className="h-7 rounded-full border border-transparent px-3 text-[0.72rem] font-[720] whitespace-nowrap text-pixel-muted transition-colors duration-150 hover:text-pixel-ink focus-visible:outline-2 focus-visible:outline-pixel-orange aria-pressed:border-pixel-ink aria-pressed:bg-pixel-paper-bright aria-pressed:text-pixel-ink"
          key={option.id}
          onClick={() => onChange(option.id)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function TestImages({
  staged,
  onToggle,
  onUpload,
}: {
  staged: Staged[];
  onToggle: (id: string) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const uploads = staged.filter((item) => item.source === "upload");

  return (
    <section aria-labelledby="images-heading" className={ui.panel}>
      <div className={ui.panelHeader}>
        <h2 className={`${ui.overline} m-0`} id="images-heading">
          Test images
          <span className="ms-2 font-pixel-mono text-pixel-subtle normal-case">
            {staged.length} staged
          </span>
        </h2>
        <label className={`${ui.small} cursor-pointer`}>
          <Upload aria-hidden="true" size={12} />
          Upload your own
          <input
            accept="image/*"
            className="sr-only"
            multiple
            onChange={onUpload}
            type="file"
          />
        </label>
      </div>
      <ul className="m-0 grid list-none gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {SAMPLES.map((sample) => {
          const active = staged.some((item) => item.id === sample.id);
          return (
            <li key={sample.id}>
              <button
                aria-pressed={active}
                className="grid h-full w-full gap-0.5 rounded-lg border border-pixel-line px-3 py-2 text-start transition-colors duration-150 hover:border-pixel-ink focus-visible:outline-2 focus-visible:outline-pixel-orange aria-pressed:border-pixel-ink aria-pressed:bg-pixel-paper-bright"
                onClick={() => onToggle(sample.id)}
                type="button"
              >
                <span className="text-[0.82rem] font-[720]">
                  {sample.label}
                </span>
                <span className="text-[0.7rem] leading-snug text-pixel-subtle">
                  {sample.purpose}
                </span>
              </button>
            </li>
          );
        })}
        {uploads.map((item) => (
          <li key={item.id}>
            <div className="flex h-full items-center justify-between gap-2 rounded-lg border border-pixel-ink bg-pixel-paper-bright px-3 py-2">
              <span className="min-w-0 truncate text-[0.82rem] font-[720]">
                {item.file.name}
              </span>
              <button
                aria-label={`Unstage ${item.file.name}`}
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-full hover:bg-pixel-canvas focus-visible:outline-2 focus-visible:outline-pixel-orange"
                onClick={() => onToggle(item.id)}
                type="button"
              >
                <X aria-hidden="true" size={13} />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <p className="m-0 border-t border-pixel-line px-4 py-2.5 text-[0.74rem] text-pixel-subtle">
        <Link2 aria-hidden="true" className="me-1 inline" size={12} />
        Staged images go straight into the preview and feed the Methods and Core
        API tabs. Samples are drawn in your browser; nothing is uploaded.
      </p>
    </section>
  );
}
