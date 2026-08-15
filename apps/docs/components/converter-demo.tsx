"use client";

import { useEffect, useState } from "react";
import { useTheme } from "fumadocs-ui/provider/base";

type ImageConverterComponent =
  (typeof import("pixelshift-react"))["ImageConverter"];

export function ConverterDemo() {
  const [ImageConverter, setImageConverter] =
    useState<ImageConverterComponent>();
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Ready when you are");
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    let active = true;

    import("pixelshift-react")
      .then(({ ImageConverter: ReactImageConverter }) => {
        if (active) {
          setImageConverter(() => ReactImageConverter);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) setStatus("The demo could not be loaded");
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-w-0 overflow-hidden rounded-[18px] border border-pixel-ink bg-pixel-canvas shadow-[12px_12px_0] shadow-pixel-ink max-[430px]:rounded-xl max-[430px]:shadow-[6px_6px_0]">
      <div className="grid min-h-14.5 grid-cols-[1fr_auto_1fr] items-center border-b border-pixel-ink bg-pixel-paper-bright px-[1.2rem] max-[700px]:grid-cols-[auto_minmax(0,1fr)] max-[430px]:px-3">
        <span className="flex gap-[0.4rem]" aria-hidden="true">
          <i className="size-2.25 rounded-full border border-pixel-ink bg-pixel-orange" />
          <i className="size-2.25 rounded-full border border-pixel-ink bg-pixel-lime" />
          <i className="size-2.25 rounded-full border border-pixel-ink bg-transparent" />
        </span>
        <span className="flex min-w-0 max-w-full items-center gap-[0.45rem] text-xs font-bold max-[700px]:justify-self-end">
          <span className="size-1.75 shrink-0 rounded-full bg-pixel-success shadow-[0_0_0_4px] shadow-pixel-success/[0.14]" />
          <span className="truncate">{status}</span>
        </span>
        <span className="justify-self-end text-[0.61rem] font-[760] tracking-[0.14em] text-pixel-subtle uppercase max-[700px]:hidden">
          100% browser-side
        </span>
      </div>
      <div className="min-h-135 min-w-0 bg-[linear-gradient(90deg,var(--pixelshift-canvas-grid)_1px,transparent_1px),linear-gradient(var(--pixelshift-canvas-grid)_1px,transparent_1px)] bg-pixel-canvas p-[clamp(1rem,5vw,4.5rem)] bg-size-[22px_22px] max-[700px]:min-h-115 max-[700px]:p-3 max-[430px]:p-2">
        {ready && ImageConverter ? (
          <ImageConverter
            className="mx-auto block w-full min-w-0 max-w-215"
            format="webp"
            quality={0.85}
            maxWidth={2400}
            maxHeight={2400}
            multiple
            isDarkMode={resolvedTheme === "dark"}
            onConversionStart={() => setStatus("Converting locally…")}
            onConversionComplete={(event) => {
              const count = event.detail.length;
              setStatus(
                `${count} ${count === 1 ? "image" : "images"} converted`,
              );
            }}
            onConversionError={() =>
              setStatus("Conversion could not be completed")
            }
          />
        ) : (
          <div
            className="flex min-h-97.5 items-center justify-center gap-[0.8rem] text-[0.85rem] font-bold"
            role="status"
          >
            <span className="size-3.5 animate-spin rounded-full border-2 border-pixel-line border-t-pixel-orange motion-reduce:animate-none" />
            Loading the converter…
          </div>
        )}
      </div>
    </div>
  );
}
