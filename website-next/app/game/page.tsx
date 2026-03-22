import GamePage from "@/views/game-page";
import type {Metadata} from "next";
import {Suspense} from "react";
import {buildPageMetadata} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
    title: "KOB Q3 SERVER",
    description: "",
    path: "/game",
    robots: {
        index: false,
        follow: false,
        noarchive: true,
        googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
        },
    },
});

export default function GameRoute() {
    return (
        <Suspense fallback={null}>
            <GamePage/>
        </Suspense>
    );
}
