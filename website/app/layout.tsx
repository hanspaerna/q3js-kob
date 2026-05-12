import "./globals.css";
import type {Viewport} from "next";
import QueryClientProviderWrapper from "@/lib/query-client-provider-wrapper.tsx";
import {TimeZoneSync} from "@/components/time-zone-sync";
import {ServiceWorkerRegistration} from "@/components/service-worker-registration.tsx";
import {SessionProvider} from "@/components/session-provider";
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
    default: process.env.WEBSITE_TITLE ?? "",
    template: `%s | ${process.env.WEBSITE_TITLE ?? ""}`,
  },
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en-US">
            <head>
                <script dangerouslySetInnerHTML={{ __html: `
                    window.__ENV__ = {
                        masterServerUrl: "${process.env.MASTER_SERVER_URL}",
                        websiteTitle: "${process.env.WEBSITE_TITLE}",
                        appVersion: "${process.env.APP_VERSION ?? "0.0.0"}"
                    }
                `}} />
            </head>
            <body className="antialiased">
                <SessionProvider>
                    <QueryClientProviderWrapper>
                        <ServiceWorkerRegistration/>
                        <TimeZoneSync/>
                        <div className="font-mono">{children}</div>
                    </QueryClientProviderWrapper>
                </SessionProvider>
            </body>
        </html>
    );
}
