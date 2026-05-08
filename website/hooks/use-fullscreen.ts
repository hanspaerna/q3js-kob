import {useEffect} from "react";

export function useFullscreenOnKey() {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
           if (e.shiftKey && e.key === "F") {
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