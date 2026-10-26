import { ArrowUpRight, Coffee } from "lucide-react";
import { coffeeUrl } from "@/lib/links";

/** A quiet support link at the foot of the docs sidebar. */
export function SidebarSupport() {
  return (
    <a
      className="group mt-2 flex items-center gap-2.5 rounded-lg border bg-fd-secondary/50 p-1.5 pe-2.5 text-sm text-fd-muted-foreground no-underline transition-colors duration-150 hover:bg-fd-accent hover:text-fd-accent-foreground"
      href={coffeeUrl}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-pixel-lime text-pixel-mark">
        <Coffee aria-hidden="true" size={15} />
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">
        Buy me a coffee
      </span>
      <ArrowUpRight
        aria-hidden="true"
        className="shrink-0 opacity-60 transition-opacity duration-150 group-hover:opacity-100"
        size={14}
      />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
