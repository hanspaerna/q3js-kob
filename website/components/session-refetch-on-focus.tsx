"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

export function SessionRefetchOnFocus() {
    const { update } = useSession();

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                update();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [update]);

    return null;
}
