import "./globals.css";
import type {Viewport} from "next";
import QueryClientProviderWrapper from "@/lib/query-client-provider-wrapper.tsx";
import {TimeZoneSync} from "@/components/time-zone-sync";
import {ServiceWorkerRegistration} from "@/components/service-worker-registration.tsx";
import type { Metadata } from "next";
import { env } from "@/env";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export const viewport: Viewport = {
    themeColor: "#101010",
    colorScheme: "dark",
};

export const metadata: Metadata = {
  title: {
    default: env.NEXT_PUBLIC_WEBSITE_TITLE ?? "",
    template: `%s | ${env.NEXT_PUBLIC_WEBSITE_TITLE ?? ""}`,
  },
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en-US">
        <body className="antialiased">
        <QueryClientProviderWrapper>
            <ServiceWorkerRegistration/>
            <TimeZoneSync/>
            <div className="font-mono">{children}</div>
        </QueryClientProviderWrapper>
        </body>
        </html>
    );
}
