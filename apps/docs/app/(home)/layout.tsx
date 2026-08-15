import type { ReactNode } from "react";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions } from "@/lib/layout.shared";

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <HomeLayout {...baseOptions()}>{children}</HomeLayout>
      {/* Cloudflare Web Analytics */}
      <script
        data-cf-beacon='{"token": "147bd0cd227a46e8a458788a176e62f1"}'
        src="https://static.cloudflareinsights.com/beacon.min.js"
        type="module"
      />
      {/* End Cloudflare Web Analytics */}
    </>
  );
}
