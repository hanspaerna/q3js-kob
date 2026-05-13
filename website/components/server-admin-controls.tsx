'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';

type Mode = 'KOB_CPMDM' | 'KOB_CPMTDM' | 'KOB_CPMCTF';
type Gameplay = 0 | 1 | 2 | 3;

const MODES: { value: Mode; label: string }[] = [
    { value: 'KOB_CPMDM', label: 'DM' },
    { value: 'KOB_CPMTDM', label: 'TDM' },
    { value: 'KOB_CPMCTF', label: 'CTF' },
];

const GAMEPLAYS: { value: Gameplay; label: string }[] = [
    { value: 0, label: 'VQ3' },
    { value: 1, label: 'PMC' },
    { value: 2, label: 'CPM' },
    { value: 3, label: 'CQ3' },
];

const OVERTIMES: { value: number; label: string }[] = [
    { value: 0, label: 'Sudden Death' },
    { value: 1, label: '120 sec' },
    { value: 2, label: 'None' },
];

const COOLDOWN_MS = 2000;

type Props = {
    host: string;
    port: number;
};

export function ServerAdminControls({ host, port }: Props) {
    const { data: session } = useSession();
    const [cooldown, setCooldown] = useState(false);
    const [rconPassword, setRconPassword] = useState<string | null>(null);

    const withCooldown = useCallback((fn: () => void) => {
        if (cooldown) return;
        fn();
        setCooldown(true);
        setTimeout(() => setCooldown(false), COOLDOWN_MS);
    }, [cooldown]);

    if (!session) {
        return null;
    }

    const sendMode = (mode: Mode) => {
        withCooldown(() => {
            fetch('/api/rcon/mode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ host, port, mode }),
            }).catch(console.error);
        });
    };

    const sendInstagib = (enabled: boolean) => {
        withCooldown(() => {
            fetch('/api/rcon/instagib', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ host, port, enabled }),
            }).catch(console.error);
        });
    };

    const sendGameplay = (gameplay: Gameplay) => {
        withCooldown(() => {
            fetch('/api/rcon/gameplay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ host, port, gameplay }),
            }).catch(console.error);
        });
    };

    const sendThrufloors = (enabled: boolean) => {
        withCooldown(() => {
            fetch('/api/rcon/thrufloors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ host, port, enabled }),
            }).catch(console.error);
        });
    };

    const sendOvertime = (overtime: number) => {
        withCooldown(() => {
            fetch('/api/rcon/overtime', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ host, port, overtime }),
            }).catch(console.error);
        });
    };

    const revealRconPassword = async () => {
        if (rconPassword !== null) return;
        try {
            const res = await fetch('/api/rcon/password');
            const data = await res.json();
            if (data.password) {
                setRconPassword(data.password);
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground mr-1">Mode:</span>
                {MODES.map(({ value, label }) => (
                    <Button
                        key={value}
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        disabled={cooldown}
                        onClick={() => sendMode(value)}
                    >
                        {label}
                    </Button>
                ))}
            </div>
            <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground mr-1">Gameplay:</span>
                {GAMEPLAYS.map(({ value, label }) => (
                    <Button
                        key={value}
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        disabled={cooldown}
                        onClick={() => sendGameplay(value)}
                    >
                        {label}
                    </Button>
                ))}
            </div>
            <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground mr-1">Instagib:</span>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    disabled={cooldown}
                    onClick={() => sendInstagib(true)}
                >
                    On
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    disabled={cooldown}
                    onClick={() => sendInstagib(false)}
                >
                    Off
                </Button>
            </div>
            <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground mr-1">Thrufloors:</span>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    disabled={cooldown}
                    onClick={() => sendThrufloors(true)}
                >
                    On
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    disabled={cooldown}
                    onClick={() => sendThrufloors(false)}
                >
                    Off
                </Button>
            </div>
            <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground mr-1">Overtime:</span>
                {OVERTIMES.map(({ value, label }) => (
                    <Button
                        key={value}
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        disabled={cooldown}
                        onClick={() => sendOvertime(value)}
                    >
                        {label}
                    </Button>
                ))}
            </div>
            {rconPassword === null ? (
                <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground mr-1">rcon/ref pass:</span>
                    <span
                        className="text-xs bg-muted px-2 py-0.5 rounded cursor-pointer select-none"
                        onClick={revealRconPassword}
                    >
                        Click to reveal
                    </span>
                </div>
            ) : (
                <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground mr-1">rcon/ref pass:</span>
                    <code
                        className="text-xs bg-muted px-2 py-0.5 rounded font-mono cursor-pointer"
                        onClick={() => setRconPassword(null)}
                    >
                        {rconPassword}
                    </code>
                </div>
            )}
        </div>
    );
}
