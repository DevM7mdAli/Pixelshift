"use client";

import { RotateCcw } from "lucide-react";
import type { PropValue } from "@/lib/playground/code";
import type { Control } from "@/lib/playground/schema";
import { Switch, ui } from "./ui";

interface PropControlsProps {
  controls: Control[];
  /** The element's own defaults, read from a live instance. */
  defaults: Record<string, PropValue>;
  overrides: Record<string, PropValue>;
  onChange: (key: string, value: PropValue) => void;
  onResetAll: () => void;
}

export function PropControls({
  controls,
  defaults,
  overrides,
  onChange,
  onResetAll,
}: PropControlsProps) {
  const changed = Object.keys(overrides).length;

  return (
    <section aria-labelledby="props-heading" className={ui.panel}>
      <div className={ui.panelHeader}>
        <h2 className={`${ui.overline} m-0`} id="props-heading">
          Props
          <span className="ms-2 font-pixel-mono text-pixel-orange normal-case">
            {changed} changed
          </span>
        </h2>
        <button
          className={ui.small}
          disabled={changed === 0}
          onClick={onResetAll}
          type="button"
        >
          <RotateCcw aria-hidden="true" size={12} />
          Reset all
        </button>
      </div>
      <div className="grid gap-4 p-4">
        {controls.map((control) => (
          <Row
            control={control}
            defaultValue={defaults[control.key]}
            key={control.key}
            onChange={(value) => onChange(control.key, value)}
            value={overrides[control.key]}
          />
        ))}
      </div>
    </section>
  );
}

function Row({
  control,
  defaultValue,
  value,
  onChange,
}: {
  control: Control;
  defaultValue: PropValue;
  value: PropValue;
  onChange: (value: PropValue) => void;
}) {
  const id = `prop-${control.key}`;
  const modified = value !== undefined;
  const current = modified ? value : defaultValue;

  return (
    <div className="grid min-w-0 gap-1.5">
      <div className="flex min-h-5 items-center justify-between gap-2">
        <label
          className={`${ui.mono} min-w-0 truncate font-[720] text-pixel-ink`}
          htmlFor={id}
          title={control.hint}
        >
          {control.key}
        </label>
        {modified ? (
          <button
            aria-label={`Reset ${control.key} to its default`}
            className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-pixel-orange transition-colors duration-150 hover:bg-pixel-paper-bright focus-visible:outline-2 focus-visible:outline-pixel-orange"
            onClick={() => onChange(undefined)}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={12} />
          </button>
        ) : (
          <span className="text-[0.66rem] text-pixel-subtle">default</span>
        )}
      </div>
      <Input control={control} current={current} id={id} onChange={onChange} />
      {control.hint ? (
        <p className="m-0 text-[0.7rem] leading-snug text-pixel-subtle">
          {control.hint}
        </p>
      ) : null}
    </div>
  );
}

function Input({
  control,
  current,
  id,
  onChange,
}: {
  control: Control;
  current: PropValue;
  id: string;
  onChange: (value: PropValue) => void;
}) {
  switch (control.kind) {
    case "boolean":
      return (
        <div>
          <Switch
            checked={current === true}
            id={id}
            label={control.key}
            onChange={onChange}
          />
        </div>
      );
    case "select":
      return (
        <select
          className={ui.field}
          id={id}
          onChange={(event) =>
            onChange(event.target.value === "" ? undefined : event.target.value)
          }
          value={current === undefined ? "" : String(current)}
        >
          {control.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case "range":
      return (
        <div className="flex items-center gap-3">
          <input
            className="h-9 min-w-0 flex-1 accent-pixel-orange"
            id={id}
            max={control.max}
            min={control.min}
            onChange={(event) => onChange(Number(event.target.value))}
            step={control.step}
            type="range"
            value={Number(current ?? control.min)}
          />
          <output
            className={`${ui.mono} w-10 text-end tabular-nums`}
            htmlFor={id}
          >
            {Number(current ?? control.min)}
          </output>
        </div>
      );
    case "number": {
      const scale = control.scale ?? 1;
      const shown =
        typeof current === "number" ? String(Math.round(current / scale)) : "";
      return (
        <div className="relative flex">
          <input
            className={`${ui.field} ${control.unit ? "pe-10" : ""}`}
            id={id}
            inputMode="numeric"
            max={control.max}
            min={control.min}
            onChange={(event) => {
              const value = Number(event.target.value);
              onChange(
                event.target.value === "" ||
                  !Number.isFinite(value) ||
                  value <= 0
                  ? undefined
                  : value * scale,
              );
            }}
            placeholder="unset"
            step={control.step ?? 1}
            type="number"
            value={shown}
          />
          {control.unit ? (
            <span className="pointer-events-none absolute inset-y-0 end-2.5 flex items-center text-[0.7rem] text-pixel-subtle">
              {control.unit}
            </span>
          ) : null}
        </div>
      );
    }
    case "color":
      return (
        <div className="flex items-center gap-2">
          <input
            className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-pixel-line bg-pixel-paper p-1"
            id={id}
            onChange={(event) => onChange(event.target.value)}
            type="color"
            value={typeof current === "string" ? current : "#ffffff"}
          />
          <span className={`${ui.mono} text-pixel-muted`}>
            {typeof current === "string" ? current : "unset"}
          </span>
        </div>
      );
    case "text":
      return (
        <input
          className={ui.field}
          id={id}
          onChange={(event) =>
            onChange(event.target.value === "" ? undefined : event.target.value)
          }
          placeholder={control.placeholder}
          type="text"
          value={typeof current === "string" ? current : ""}
        />
      );
  }
}
