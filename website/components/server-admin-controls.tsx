'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSession } from 'next-auth/react';
import { hasManagerAccess } from '@/lib/auth';
import { useToast, ToastMessage } from '@/components/toast';

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

const BOT_LEVELS = [1, 2, 3, 4, 5] as const;

const BOT_MODELS = [
    'anarki', 'angel', 'biker', 'bitterman', 'bones', 'cadaver', 'crash', 'daemia', 'doom',
    'gorre', 'grunt', 'hossman', 'hunter', 'keel', 'klesk', 'lucy', 'major', 'mynx', 'orbb',
    'patriot', 'phobos', 'ranger', 'razor', 'sarge', 'slash', 'sorlag', 'tankjr', 'uriel', 'visor', 'xaero',
] as const;

const COOLDOWN_MS = 2000;

type Props = {
    host: string;
    port: number;
    fraglimit: number;
    timelimit: number;
    gametype: number;
};

export function ServerAdminControls({ host, port, fraglimit, timelimit, gametype }: Props) {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const [cooldown, setCooldown] = useState(false);
    const [rconPassword, setRconPassword] = useState<string | null>(null);
    const [fraglimitValue, setFraglimitValue] = useState(fraglimit.toString());
    const [timelimitValue, setTimelimitValue] = useState(timelimit.toString());
    const [botLevel, setBotLevel] = useState<typeof BOT_LEVELS[number]>(3);
    const [botModel, setBotModel] = useState<typeof BOT_MODELS[number]>('crash');
    const [botTeam, setBotTeam] = useState<'red' | 'blue'>('red');
    const [kickClientId, setKickClientId] = useState('');
    const [mapValue, setMapValue] = useState('');
    const [chatMessage, setChatMessage] = useState('');

    const withCooldown = useCallback(async (fn: () => Promise<Response>) => {
        if (cooldown) return;
        setCooldown(true);
        setTimeout(() => setCooldown(false), COOLDOWN_MS);
        try {
            const res = await fn();
            if (res.ok) {
                showToast(ToastMessage.COMMAND_SENT);
            } else if (res.status === 401) {
                showToast(ToastMessage.SESSION_EXPIRED);
            }
        } catch (e) {
            console.error(e);
        }
    }, [cooldown, showToast]);

    if (!hasManagerAccess(session?.user?.groups)) {
        return null;
    }

    const sendMode = (mode: Mode) => {
        withCooldown(() => fetch('/api/rcon/mode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host, port, mode }),
        }));
    };

    const sendInstagib = (enabled: boolean) => {
        withCooldown(() => fetch('/api/rcon/instagib', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host, port, enabled }),
        }));
    };

    const sendGameplay = (gameplay: Gameplay) => {
        withCooldown(() => fetch('/api/rcon/gameplay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host, port, gameplay }),
        }));
    };

    const sendThrufloors = (enabled: boolean) => {
        withCooldown(() => fetch('/api/rcon/thrufloors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host, port, enabled }),
        }));
    };

    const sendOvertime = (overtime: number) => {
        withCooldown(() => fetch('/api/rcon/overtime', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host, port, overtime }),
        }));
    };

    const sendRestart = () => {
        withCooldown(() => fetch('/api/rcon/restart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host, port }),
        }));
    };

    const sendFraglimit = () => {
        const value = parseInt(fraglimitValue, 10);
        if (isNaN(value) || value < 0) return;
        withCooldown(() => fetch('/api/rcon/fraglimit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host, port, fraglimit: value }),
        }));
    };

    const sendTimelimit = () => {
        const value = parseInt(timelimitValue, 10);
        if (isNaN(value) || value < 0) return;
        withCooldown(() => fetch('/api/rcon/timelimit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host, port, timelimit: value }),
        }));
    };

    const sendAddBot = () => {
        const isTeamGame = gametype === 3 || gametype === 4;
        withCooldown(() => fetch('/api/rcon/addbot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                host,
                port,
                model: botModel,
                level: botLevel,
                ...(isTeamGame && { team: botTeam }),
            }),
        }));
    };

    const sendKick = () => {
        if (!kickClientId.trim()) return;
        withCooldown(() => fetch('/api/rcon/kick', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host, port, clientId: parseInt(kickClientId.trim(), 10) }),
        }));
        setKickClientId('');
    };

    const sendKickBots = () => {
        withCooldown(() => fetch('/api/rcon/kickbots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host, port }),
        }));
    };

    const sendMap = () => {
        if (!mapValue.trim()) return;
        withCooldown(() => fetch('/api/rcon/map', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host, port, map: mapValue.trim() }),
        }));
    };

    const sendChat = () => {
        if (!chatMessage.trim()) return;
        withCooldown(() => fetch('/api/rcon/say', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host, port, message: chatMessage.trim() }),
        }));
        setChatMessage('');
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
        <div className="mt-2">
            <div className="flex flex-wrap items-center gap-3">
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
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground mr-1">
                            {gametype === 4 ? 'Capturelimit:' : 'Fraglimit:'}
                        </span>
                        <Input
                            type="number"
                            min="0"
                            className="h-6 w-16 px-2 text-xs"
                            value={fraglimitValue}
                            onChange={(e) => setFraglimitValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendFraglimit()}
                            disabled={cooldown}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            disabled={cooldown}
                            onClick={sendFraglimit}
                        >
                            Set
                        </Button>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground mr-1">Timelimit:</span>
                        <Input
                            type="number"
                            min="0"
                            className="h-6 w-16 px-2 text-xs"
                            value={timelimitValue}
                            onChange={(e) => setTimelimitValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendTimelimit()}
                            disabled={cooldown}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            disabled={cooldown}
                            onClick={sendTimelimit}
                        >
                            Set
                        </Button>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground mr-1">Add bot:</span>
                        <select
                            className="h-6 px-1 text-xs bg-background border border-input rounded"
                            value={botModel}
                            onChange={(e) => setBotModel(e.target.value as typeof BOT_MODELS[number])}
                            disabled={cooldown}
                        >
                            {BOT_MODELS.map((model) => (
                                <option key={model} value={model}>
                                    {model}
                                </option>
                            ))}
                        </select>
                        <select
                            className="h-6 px-1 text-xs bg-background border border-input rounded w-12"
                            value={botLevel}
                            onChange={(e) => setBotLevel(Number(e.target.value) as typeof BOT_LEVELS[number])}
                            disabled={cooldown}
                        >
                            {BOT_LEVELS.map((level) => (
                                <option key={level} value={level}>
                                    Lv{level}
                                </option>
                            ))}
                        </select>
                        {(gametype === 3 || gametype === 4) && (
                            <select
                                className="h-6 px-1 text-xs bg-background border border-input rounded"
                                value={botTeam}
                                onChange={(e) => setBotTeam(e.target.value as 'red' | 'blue')}
                                disabled={cooldown}
                            >
                                <option value="red">Red</option>
                                <option value="blue">Blue</option>
                            </select>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            disabled={cooldown}
                            onClick={sendAddBot}
                        >
                            Add
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            disabled={cooldown}
                            onClick={sendKickBots}
                        >
                            Kick all bots
                        </Button>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground mr-1">Kick:</span>
                        <Input
                            type="text"
                            placeholder="id..."
                            className="h-6 w-24 px-2 text-xs"
                            value={kickClientId}
                            onChange={(e) => setKickClientId(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendKick()}
                            disabled={cooldown}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            disabled={cooldown || !kickClientId.trim()}
                            onClick={sendKick}
                        >
                            Kick
                        </Button>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground mr-1">Map:</span>
                        <Input
                            type="text"
                            placeholder="..."
                            className="h-6 w-24 px-2 text-xs"
                            value={mapValue}
                            onChange={(e) => setMapValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMap()}
                            disabled={cooldown}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            disabled={cooldown || !mapValue.trim()}
                            onClick={sendMap}
                        >
                            Set
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            disabled={cooldown}
                            onClick={sendRestart}
                        >
                            Restart
                        </Button>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground mr-1">Chat:</span>
                        <Input
                            type="text"
                            placeholder="Message..."
                            className="h-6 w-48 px-2 text-xs"
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                            disabled={cooldown}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            disabled={cooldown || !chatMessage.trim()}
                            onClick={sendChat}
                        >
                            Send
                        </Button>
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
        </div>
    );
}
