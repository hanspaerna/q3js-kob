"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export function SessionRefetchOnNavigate() {
    const pathname = usePathname();
    const { update } = useSession();
    const previousPathname = useRef(pathname);

    useEffect(() => {
        if (previousPathname.current !== pathname) {
            previousPathname.current = pathname;
            update();
        }
    }, [pathname, update]);

    return null;
}
