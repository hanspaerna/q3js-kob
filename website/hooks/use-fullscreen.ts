import {useEffect} from "react";

export function useFullscreenOnKey() {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
           if (e.shiftKey && e.code === "KeyF") {
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