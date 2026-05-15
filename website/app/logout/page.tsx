'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

const REDIRECT_DELAY = 3;

export default function LogoutPage() {
    const router = useRouter();
    const [countdown, setCountdown] = useState(REDIRECT_DELAY);
    const hasRedirected = useRef(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (countdown === 0 && !hasRedirected.current) {
            hasRedirected.current = true;
            router.push('/');
        }
    }, [countdown, router]);

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="text-center space-y-4">
                <LogOut size={48} className="mx-auto text-muted-foreground" />
                <h1 className="text-2xl font-bold">You have been logged out</h1>
                <p className="text-muted-foreground">
                    Redirecting to home in {countdown}...
                </p>
            </div>
        </div>
    );
}
