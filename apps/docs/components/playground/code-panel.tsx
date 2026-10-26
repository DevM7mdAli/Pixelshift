"use client";

import { useState } from "react";
import type { GeneratedCode } from "@/lib/playground/code";
import { CopyButton, Tabs, ui } from "./ui";

const FORMATS = [
  { id: "html", label: "HTML" },
  { id: "react", label: "React" },
  { id: "js", label: "JavaScript" },
] as const;

type Format = (typeof FORMATS)[number]["id"];

export function CodePanel({
  code,
  changed,
}: {
  code: GeneratedCode;
  changed: number;
}) {
  const [format, setFormat] = useState<Format>("html");

  return (
    <div className="grid gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs
          idPrefix="code"
          label="Code format"
          onChange={setFormat}
          tabs={FORMATS}
          value={format}
        />
        <CopyButton text={code[format]} />
      </div>
      <p className="m-0 text-[0.78rem] text-pixel-muted">
        {changed === 0
          ? "Every prop is at its default, so none are written."
          : `Only the ${changed} prop${changed === 1 ? "" : "s"} you changed.`}
      </p>
      <pre
        className={ui.code}
        id={`code-panel-${format}`}
        role="tabpanel"
        tabIndex={0}
      >
        <code>{code[format]}</code>
      </pre>
    </div>
  );
}
