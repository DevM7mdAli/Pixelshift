import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { SidebarSupport } from "@/components/sidebar-support";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

export default function DocumentationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DocsLayout
      {...baseOptions()}
      sidebar={{ footer: <SidebarSupport /> }}
      tree={source.getPageTree()}
    >
      {children}
    </DocsLayout>
  );
}
