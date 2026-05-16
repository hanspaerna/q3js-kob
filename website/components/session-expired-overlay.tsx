"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SessionExpiredOverlay() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [dismissed, setDismissed] = useState(false);

    const isGamePage = pathname === "/game";

    if (!session?.error || dismissed) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="mx-4 max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
                <h2 className="text-lg font-semibold text-foreground">
                    Session Expired
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    Your session has expired and could not be refreshed. Please sign in again to continue.
                </p>
                <div className="mt-4 flex justify-end gap-2">
                    {isGamePage && (
                        <Button variant="outline" onClick={() => setDismissed(true)}>
                            STFU, I'm still fraggin'!
                        </Button>
                    )}
                    <Button onClick={() => signIn("authelia")}>
                        Sign In
                    </Button>
                </div>
            </div>
        </div>
    );
}
