import type { Metadata } from "next";
import { Playground } from "@/components/playground/playground";

export const metadata: Metadata = {
  title: "Playground",
  description:
    "Toggle every prop, call every method, watch every event, and run the core functions of Pixelshift in your browser.",
};

export default function PlaygroundPage() {
  return (
    <main className="mx-auto w-[min(1240px,calc(100%-40px))] min-w-0 py-12 font-pixel-sans text-pixel-ink max-[700px]:w-[min(1240px,calc(100%-24px))] max-[700px]:py-8">
      <header className="mb-8 max-w-200">
        <p className="mb-2 text-[0.7rem] font-[760] tracking-[0.14em] text-pixel-orange uppercase">
          Playground
        </p>
        <h1 className="m-0 font-pixel-serif text-[clamp(2.4rem,5vw,4rem)] leading-none font-normal tracking-[-0.05em]">
          Try every prop and method.
        </h1>
        <p className="mt-4 mb-0 text-[1rem] leading-[1.7] text-pixel-muted">
          Change props, call the public API, watch events, and run the core
          functions on test images. Everything runs in your browser.
        </p>
      </header>
      <Playground />
    </main>
  );
}
