import "./globals.css";
import type {Viewport} from "next";
import QueryClientProviderWrapper from "@/lib/query-client-provider-wrapper.tsx";
import {TimeZoneSync} from "@/components/time-zone-sync";
import {ServiceWorkerRegistration} from "@/components/service-worker-registration.tsx";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export const viewport: Viewport = {
    themeColor: "#101010",
    colorScheme: "dark",
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
