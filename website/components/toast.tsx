"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";

export const ToastMessage = {
    COMMAND_SENT: "Command sent.",
    SESSION_EXPIRED: "Access denied. Expired session?",
} as const;

export type ToastMessageType = typeof ToastMessage[keyof typeof ToastMessage];

const TOAST_STYLES: Record<ToastMessageType, string> = {
    [ToastMessage.COMMAND_SENT]: "border-green-500/50 bg-green-950 text-green-200",
    [ToastMessage.SESSION_EXPIRED]: "border-red-500/50 bg-red-950 text-red-200",
};

type ToastContextType = {
    showToast: (message: ToastMessageType | string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within ToastProvider");
    }
    return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [message, setMessage] = useState<string | null>(null);
    const [visible, setVisible] = useState(false);

    const showToast = useCallback((msg: string) => {
        setMessage(msg);
        setVisible(true);
    }, []);

    useEffect(() => {
        if (visible) {
            const fadeTimer = setTimeout(() => setVisible(false), 1700);
            const removeTimer = setTimeout(() => setMessage(null), 2000);
            return () => {
                clearTimeout(fadeTimer);
                clearTimeout(removeTimer);
            };
        }
    }, [visible, message]);

    const style = message && message in TOAST_STYLES
        ? TOAST_STYLES[message as ToastMessageType]
        : "border-green-500/50 bg-green-950 text-green-200";

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {message && (
                <div className={`fixed bottom-4 right-4 z-50 rounded-md border px-4 py-2 text-sm shadow-lg transition-opacity duration-300 ${style} ${visible ? "opacity-100" : "opacity-0"}`}>
                    {message}
                </div>
            )}
        </ToastContext.Provider>
    );
}
