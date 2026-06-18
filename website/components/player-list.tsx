'use client';

import Link from "next/link";
import {Users, X} from "lucide-react";
import {ScrollArea} from "@/components/ui/scroll-area.tsx";
import {Q3ColoredText} from "@/components/q3-colored-text.tsx";
import {ServerUserResponse} from "@/lib/client";
import {useSession} from "next-auth/react";
import {useState, useCallback} from "react";
import {Button} from "@/components/ui/button.tsx";
import {hasManagerAccess} from "@/lib/auth";
import {useToast, ToastMessage} from "@/components/toast";

type Props = {
    users: ServerUserResponse[];
    host?: string;
    port?: number;
    disablePlayerLinks?: boolean;
};

const COOLDOWN_MS = 2000;

export function PlayerList({users, host, port, disablePlayerLinks}: Props) {
    const {data: session} = useSession();
    const {showToast} = useToast();
    const [cooldown, setCooldown] = useState(false);

    const kickPlayer = useCallback(async (clientId: number) => {
        if (cooldown || !host || !port) return;

        setCooldown(true);
        setTimeout(() => setCooldown(false), COOLDOWN_MS);
        try {
            const res = await fetch('/api/rcon/kick', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({host, port, clientId}),
            });
            if (res.ok) {
                showToast(ToastMessage.COMMAND_SENT);
            } else if (res.status === 401) {
                showToast(ToastMessage.SESSION_EXPIRED);
            }
        } catch (e) {
            console.error(e);
        }
    }, [cooldown, host, port, showToast]);

    const canKick = hasManagerAccess(session?.user?.groups) && !!host && !!port;

    return <div className="mt-4 border-t border-border/50 pt-4">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4"/>
                <span className="font-semibold text-foreground">
                    Players ({users.length})
                </span>
            </div>
        </div>

        <div>
            {users.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                    No players online.
                </p>
            ) : (
                <ScrollArea
                    className="h-40 overflow-y-auto rounded-md border border-border/40 bg-background/40">
                    <div
                        className={`grid ${canKick ? 'grid-cols-[2rem_3rem_3rem_minmax(0,1fr)_2rem]' : 'grid-cols-[2rem_3rem_3rem_minmax(0,1fr)]'} px-3 py-2 text-[11px] text-muted-foreground border-b border-border/40`}>
                        <span>ID</span>
                        <span>SCORE</span>
                        <span>PING</span>
                        <span>NAME</span>
                        {canKick && <span></span>}
                    </div>
                    {users.map((u, idx) => (
                        <div
                            key={`player-${idx}-${u.name}`}
                            className={`grid ${canKick ? 'grid-cols-[2rem_3rem_3rem_minmax(0,1fr)_2rem]' : 'grid-cols-[2rem_3rem_3rem_minmax(0,1fr)]'} px-3 py-1.5 text-[11px] text-foreground odd:bg-background/40 items-center`}
                        >
                            <span className="tabular-nums">{u.clientId}</span>
                            <span className="tabular-nums">{u.score}</span>
                            <span className="tabular-nums">{u.ping}</span>
                            {!disablePlayerLinks
                                ? (
                                    <Link
                                        href={`/players/${encodeURIComponent(u.name)}`}
                                        className="truncate hover:text-primary transition-colors"
                                    >
                                        <Q3ColoredText text={u.name}/>
                                    </Link>
                                )
                                : (<Q3ColoredText text={u.name}/>)
                            }
                            {canKick && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                                    disabled={cooldown}
                                    onClick={() => kickPlayer(u.clientId)}
                                    title="Kick player"
                                >
                                    <X className="h-3 w-3"/>
                                </Button>
                            )}
                        </div>
                    ))}
                </ScrollArea>
            )}
        </div>
    </div>;
}
