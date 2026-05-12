import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
    const { pathname } = req.nextUrl;

    if (pathname === "/baseq3/pak0.pk3") {
        if (!req.auth) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/baseq3/pak0.pk3"],
};
