'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

const REDIRECT_DELAY = 3;

export default function LogoutPage() {
    const router = useRouter();
    const [countdown, setCountdown] = useState(REDIRECT_DELAY);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    router.push('/');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [router]);

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
