/**
 * Tailwind class strings for the controls every tool shares, so templates
 * name a role instead of repeating utility lists. Colors come from the
 * CSS-variable palette in tailwind.config.cjs.
 */
export const ui = {
  panel:
    "block w-full min-w-0 rounded-panel border border-solid border-line bg-surface p-4 sm:p-5",
  bare: "block w-full min-w-0",
  heading: "m-0 text-base font-semibold leading-6 text-ink",
  description: "m-0 mt-0.5 text-sm text-body",
  section: "mt-4",
  grid: "grid gap-x-4 gap-y-3 sm:grid-cols-2",
  label: "grid min-w-0 content-start gap-1.5 text-[13px] font-medium text-body",
  labelRow: "flex items-center justify-between gap-2",
  value: "font-normal tabular-nums text-muted",
  field:
    "box-border h-9 w-full min-w-0 rounded-control border border-solid border-line-strong bg-field px-2.5 text-sm text-ink disabled:opacity-50",
  select:
    "box-border h-9 w-full min-w-0 cursor-pointer appearance-none rounded-control border border-solid border-line-strong bg-field pl-2.5 pr-9 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-50",
  range: "box-border w-full min-w-0 disabled:opacity-50",
  check: "flex items-center gap-2 text-[13px] text-body",
  primary:
    "inline-flex h-9 items-center justify-center gap-2 rounded-control border border-solid border-transparent bg-accent px-3.5 text-sm font-semibold text-accent-ink transition-colors duration-150 hover:bg-accent-hover disabled:opacity-50 disabled:hover:bg-accent",
  secondary:
    "inline-flex h-9 items-center justify-center gap-2 rounded-control border border-solid border-line-strong bg-transparent px-3.5 text-sm font-medium text-ink no-underline transition-colors duration-150 hover:bg-hover disabled:opacity-50 disabled:hover:bg-transparent",
  small:
    "inline-flex h-8 items-center justify-center gap-1.5 rounded-control border border-solid border-line-strong bg-transparent px-2.5 text-[13px] font-medium text-ink no-underline transition-colors duration-150 hover:bg-hover disabled:opacity-50",
  icon: "inline-flex size-8 shrink-0 items-center justify-center rounded-control border-0 bg-transparent p-0 text-muted transition-colors duration-150 hover:bg-hover hover:text-ink",
  segmented:
    "scroll-x inline-flex max-w-full rounded-control border border-solid border-line-strong p-0.5",
  segment:
    "h-7 shrink-0 whitespace-nowrap rounded-[6px] border-0 bg-transparent px-2.5 text-[13px] font-medium text-body transition-colors duration-150 hover:text-ink aria-pressed:bg-accent aria-pressed:text-accent-ink",
  tabs: "scroll-x flex gap-1 border-0 border-b border-solid border-line",
  tab: "-mb-px shrink-0 whitespace-nowrap border-0 border-b-2 border-solid border-transparent bg-transparent px-2.5 pb-2 pt-1 text-sm font-medium text-muted transition-colors duration-150 hover:text-ink aria-selected:border-accent aria-selected:text-ink",
  row: "flex min-w-0 items-center gap-3 rounded-control border border-solid border-line p-2.5",
  thumb:
    "size-11 shrink-0 rounded-[6px] border border-solid border-line object-contain",
  name: "m-0 truncate text-sm font-medium text-ink",
  meta: "m-0 mt-0.5 truncate text-xs tabular-nums text-muted",
  error:
    "m-0 mt-4 rounded-control bg-danger-surface px-3 py-2.5 text-sm text-danger",
  mono: "font-mono text-xs",
} as const;
