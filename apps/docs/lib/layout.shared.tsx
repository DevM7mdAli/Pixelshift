import { BookOpenText, Boxes, Play } from "lucide-react";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="group inline-flex items-center gap-[0.6rem] font-[760] tracking-[-0.03em]">
          <span
            className="block size-8 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none"
            aria-hidden="true"
          >
            <img
              alt=""
              className="block size-full"
              height="32"
              src={`${basePath}/icon.svg`}
              width="32"
            />
          </span>
          <span>Pixelshift</span>
        </span>
      ),
    },
    links: [
      {
        text: "Docs",
        url: "/docs",
        active: "nested-url",
        icon: <BookOpenText aria-hidden="true" size={16} />,
      },
      {
        text: "Demo",
        url: "/#demo",
        icon: <Play aria-hidden="true" size={16} />,
      },
      {
        text: "Packages",
        url: "/docs/frameworks",
        icon: <Boxes aria-hidden="true" size={16} />,
      },
    ],
  };
}
