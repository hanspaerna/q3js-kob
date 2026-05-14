'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Play } from 'lucide-react';

type Props = {
    host: string;
    port: number;
    currentMap: string;
};

export function MapQueue({ host, port, currentMap }: Props) {
    const { data: session } = useSession();
    const [maps, setMaps] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const currentMapRef = useRef<HTMLDivElement>(null);
    const hasScrolledRef = useRef(false);

    const switchMap = async (map: string) => {
        if (cooldown) return;
        setCooldown(true);
        setTimeout(() => setCooldown(false), 2000);
        try {
            await fetch('/api/rcon/map', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ host, port, map }),
            });
        } catch (err) {
            console.error('Failed to switch map:', err);
        }
    };

    useEffect(() => {
        const fetchMaps = async () => {
            try {
                const res = await fetch(`https://${host}/maplist`);
                if (!res.ok) {
                    throw new Error('Failed to fetch map list');
                }
                const data = await res.json();
                setMaps(Array.isArray(data) ? data : []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load maps');
            } finally {
                setLoading(false);
            }
        };

        fetchMaps();
    }, [host]);

    useEffect(() => {
        if (hasScrolledRef.current) return;
        const currentMapLower = currentMap.toLowerCase();
        const mapExists = maps.some(map => map.toLowerCase() === currentMapLower);
        if (mapExists && currentMapRef.current && containerRef.current) {
            const container = containerRef.current;
            const element = currentMapRef.current;
            container.scrollTop = element.offsetTop - container.offsetTop - 8;
            hasScrolledRef.current = true;
        }
    }, [maps, currentMap]);

    if (loading) {
        return <p className="text-xs text-muted-foreground">Loading maps...</p>;
    }

    if (error) {
        return <p className="text-xs text-muted-foreground">{error}</p>;
    }

    if (maps.length === 0) {
        return <p className="text-xs text-muted-foreground">No maps in queue</p>;
    }

    const currentMapLower = currentMap.toLowerCase();

    return (
        <div ref={containerRef} className="flex flex-col gap-1 h-40 overflow-y-scroll rounded-md border border-border/40 bg-background/40 p-2">
            {maps.map((map, index) => {
                const isCurrentMap = map.toLowerCase() === currentMapLower;
                return (
                    <div
                        key={`${map}-${index}`}
                        ref={isCurrentMap ? currentMapRef : null}
                        className={`text-xs font-mono px-2 py-1 rounded flex items-center justify-between ${
                            isCurrentMap
                                ? 'bg-primary/20 text-primary font-semibold'
                                : 'text-muted-foreground'
                        }`}
                    >
                        <span>{map}</span>
                        {session && !isCurrentMap && (
                            <button
                                onClick={() => switchMap(map)}
                                disabled={cooldown}
                                className="p-0.5 hover:text-primary transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                                title={`Switch to ${map}`}
                            >
                                <Play className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
