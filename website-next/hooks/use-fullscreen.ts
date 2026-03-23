import {useEffect} from "react";

export function useFullscreenOnF8() {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "F8") {
                e.preventDefault();
                const el = document.documentElement;
                if (!document.fullscreenElement) {
                    el.requestFullscreen().catch(() => {
                    });
                } else {
                    document.exitFullscreen().catch(() => {
                    });
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);
}