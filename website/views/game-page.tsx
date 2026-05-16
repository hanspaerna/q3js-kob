"use client";

import {useEffect, useRef, useState, useCallback} from "react";
import {Card} from "@/components/ui/card";
import {Progress} from "@/components/ui/progress";
import {Button} from "@/components/ui/button";
import {makeRafUpdater, type Prog} from "@/lib/fs.ts";
import {useFullscreenOnKey} from "@/hooks/use-fullscreen.ts";
import startGame from "@/game";
import {useSearchParams} from "next/navigation";
import {toInt} from "@/lib/utils.ts";
import {Upload, X} from "lucide-react";
import {useQuery} from "@tanstack/react-query";
import {getAllServersOptions} from "@/lib/client/@tanstack/react-query.gen";
import {ServerCard} from "@/components/server-card";

const PAK0_EXPECTED_SHA256 = "7ce8b3910620cd50a09e4f1100f426e8c6180f68895d589f80e6bd95af54bcae";

async function sha256(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

const STAGE_LABELS: Record<Prog["stage"], string> = {
    initializing: "Initializing",
    needs_pak0: "Game Data Required",
    downloading: "Downloading assets",
    launching: "Launching",
    ready: "Ready",
    error: "Download Failed",
};

const STAGE_TIPS: Record<Prog["stage"], string> = {
    initializing: "Tip: Press Shift+F to toggle fullscreen.",
    needs_pak0: "You can find pak0.pk3 in your Quake 3 Arena installation folder.",
    downloading: "Tip: Assets are cached after first load.",
    launching: "Tip: Press H in-game to shout.",
    ready: "Tip: If sound is muted, click the page once.",
    error: "Server error.",
};

interface GamePageProps {
   customPlayerModels: string[];
}

export default function GamePage({ customPlayerModels }: GamePageProps) {
    useFullscreenOnKey();
    const gameShellRef = useRef<HTMLElement | null>(null);
    const startedGameKeyRef = useRef<string | null>(null);
    const pak0ResolverRef = useRef<((data: Uint8Array) => void) | null>(null);

    const [prog, setProg] = useState<Prog>({
        received: 0,
        total: 0,
        pct: 0,
        current: "",
        stage: "initializing"
    });
    const [rafUpdate] = useState(() => makeRafUpdater(setProg));
    const [pak0Error, setPak0Error] = useState<string | null>(null);
    const pak0AbortRef = useRef<(() => void) | null>(null);
    const [canAbortPak0, setCanAbortPak0] = useState(false);
    const [showServerOverlay, setShowServerOverlay] = useState(false);

    const searchParams = useSearchParams();
    const host = searchParams?.get("host") ?? "";
    const proxyPort = toInt(searchParams?.get("proxyPort") ?? undefined, 0);
    const name = searchParams?.get("name") ?? "Player";
    const fsGame = searchParams?.get("fs_game") ?? "baseq3";
    const canStartGame = Boolean(host && proxyPort);
    const gameStartKey = `${host}|${proxyPort}|${name}|${fsGame}|desktop}`;

    // Fetch servers for the overlay
    const { data: servers = [] } = useQuery({
        ...getAllServersOptions(),
        refetchInterval: 2000,
        enabled: showServerOverlay,
    });

    const currentServer = servers.find(s => s.host === host);

    const onNeedPak0 = useCallback(() => {
        return new Promise<Uint8Array>((resolve) => {
            pak0ResolverRef.current = resolve;
        });
    }, []);

    const onPak0DownloadStart = useCallback((abort: () => void) => {
        pak0AbortRef.current = abort;
        setCanAbortPak0(true);
    }, []);

    const handleUseOwnPak0 = useCallback(() => {
        if (pak0AbortRef.current) {
            pak0AbortRef.current();
            pak0AbortRef.current = null;
            setCanAbortPak0(false);
        }
    }, []);

    const handlePak0Upload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !pak0ResolverRef.current) return;

        setPak0Error(null);
        const buffer = await file.arrayBuffer();

        const hash = await sha256(buffer);
        if (hash !== PAK0_EXPECTED_SHA256) {
            setPak0Error(`Invalid file. Expected SHA256: ${PAK0_EXPECTED_SHA256}, got: ${hash}`);
            e.target.value = "";
            return;
        }

        const data = new Uint8Array(buffer);
        pak0ResolverRef.current(data);
        pak0ResolverRef.current = null;
    }, []);

    useEffect(() => {
        if (!canStartGame) {
            return;
        }

        if (startedGameKeyRef.current === gameStartKey) {
            return;
        }

        startedGameKeyRef.current = gameStartKey;
        startGame({
            name,
            host,
            proxyPort,
            rafUpdate,
            fsGame,
            customPlayerModels,
            onNeedPak0,
            onPak0DownloadStart
        });
    }, [canStartGame, fsGame, gameStartKey, host, name, proxyPort, rafUpdate, onNeedPak0, onPak0DownloadStart, customPlayerModels]);

    useEffect(() => {
        document.body.classList.add("game-page-active");
        document.documentElement.classList.add("game-page-active");

        return () => {
            document.body.classList.remove("game-page-active");
            document.documentElement.classList.remove("game-page-active");
        };
    }, []);

    const stageLabel = STAGE_LABELS[prog.stage];
    const tip = STAGE_TIPS[prog.stage];
    const currentLabel = prog.current
        ? {
            downloading: `Downloading: ${prog.current}`,
            initializing: prog.current,
            needs_pak0: prog.current,
            launching: prog.current,
            ready: prog.current,
            error: prog.current,
        }[prog.stage]
        : "Preparing downloads";

    const originalExitPointerLockRef = useRef<typeof document.exitPointerLock | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    // F2 to toggle server overlay
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F2') {
                e.preventDefault();
                setShowServerOverlay(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Release pointer lock and focus overlay when it opens
    useEffect(() => {
        if (showServerOverlay) {
            if (originalExitPointerLockRef.current) {
                originalExitPointerLockRef.current.call(document);
            }
            // Focus overlay after a brief delay to ensure it's mounted
            setTimeout(() => {
                overlayRef.current?.focus();
            }, 0);
        }
    }, [showServerOverlay]);

    // fix an issue with mouse pointer not getting captured back by ioquake3 after Alt+Tab or Escape
    useEffect(() => {
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        if (!canvas) return;

        // suppress ioquake3 from releasing pointer lock
        const originalExit = document.exitPointerLock.bind(document);
        originalExitPointerLockRef.current = originalExit;
        document.exitPointerLock = () => {
            console.warn('exitPointerLock suppressed');
        };

        // since ioquake3 won't re-request it either, we do it ourselves
        const handleClick = () => {
            if (showServerOverlay) return; // Don't capture while overlay is open

            // If not fullscreen, request fullscreen first (pointer lock will be requested after)
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {
                    // Fullscreen failed, just request pointer lock
                    if (document.pointerLockElement !== canvas) {
                        canvas.requestPointerLock({ unadjustedMovement: true });
                    }
                });
            } else if (document.pointerLockElement !== canvas) {
                canvas.requestPointerLock({ unadjustedMovement: true });
            }
        };

        // Force pointer lock after fullscreen is activated
        const handleFullscreenChange = () => {
            if (document.fullscreenElement) {
                canvas.requestPointerLock({ unadjustedMovement: true });
            }
        };

        canvas.addEventListener('click', handleClick);
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            document.exitPointerLock = originalExit;
            canvas.removeEventListener('click', handleClick);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [showServerOverlay]);

    // Stop keyboard events from reaching the game while overlay is open
    useEffect(() => {
        if (!showServerOverlay) return;

        // Blur canvas to remove focus from game
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        if (canvas) {
            canvas.blur();
        }

        const handleKeyCapture = (e: KeyboardEvent) => {
            // Always allow F2 to toggle overlay
            if (e.key === 'F2') return;

            // Check if targeting a form element
            const target = e.target as HTMLElement;
            const tagName = target?.tagName?.toLowerCase();
            const isFormElement = tagName === 'input' || tagName === 'select' || tagName === 'textarea' || tagName === 'button';

            if (isFormElement) {
                // Let form elements receive the event naturally
                // The bubble-phase handler on the overlay will stop it from reaching the game
                return;
            }

            // Block all other events from reaching the game
            e.stopImmediatePropagation();
            e.preventDefault();
        };

        window.addEventListener('keydown', handleKeyCapture, true);
        window.addEventListener('keyup', handleKeyCapture, true);
        window.addEventListener('keypress', handleKeyCapture, true);

        return () => {
            window.removeEventListener('keydown', handleKeyCapture, true);
            window.removeEventListener('keyup', handleKeyCapture, true);
            window.removeEventListener('keypress', handleKeyCapture, true);
        };
    }, [showServerOverlay]);

    // Bubble-phase handler to stop events from reaching game after overlay handles them
    useEffect(() => {
        if (!showServerOverlay) return;
        const overlay = overlayRef.current;
        if (!overlay) return;

        const stopBubble = (e: Event) => {
            // Allow F2 to bubble up to toggle handler
            if (e instanceof KeyboardEvent && e.key === 'F2') return;
            e.stopPropagation();
        };

        overlay.addEventListener('keydown', stopBubble);
        overlay.addEventListener('keyup', stopBubble);
        overlay.addEventListener('keypress', stopBubble);

        return () => {
            overlay.removeEventListener('keydown', stopBubble);
            overlay.removeEventListener('keyup', stopBubble);
            overlay.removeEventListener('keypress', stopBubble);
        };
    }, [showServerOverlay]);

    return (
        <main ref={gameShellRef} className="relative isolate h-dvh min-h-dvh w-screen overflow-hidden bg-black">
            <canvas id="canvas" className="absolute inset-0 z-0 h-full w-full"/>
            {prog.stage !== "ready" && (
                <Card
                    className="absolute bottom-4 left-4 right-4 z-10 border border-border bg-background/80 p-4 backdrop-blur">
                    <div className="text-sm font-semibold mb-1">
                        {stageLabel}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2 font-mono">
                        {currentLabel}
                    </div>
                    {prog.stage === "needs_pak0" ? (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                To play, please provide your legally acquired <code className="text-foreground">pak0.pk3</code> file from Quake 3 Arena.
                                Only version 1.32c is supported.
                                SHA256: 7ce8b3910620cd50a09e4f1100f426e8c6180f68895d589f80e6bd95af54bcae
                            </p>
                            <label className="flex items-center justify-center gap-2 cursor-pointer rounded-md border border-dashed border-muted-foreground/50 p-4 hover:border-foreground hover:bg-muted/50 transition-colors">
                                <Upload size={18} />
                                <span className="text-sm">Click to select pak0.pk3</span>
                                <input
                                    type="file"
                                    accept=".pk3"
                                    onChange={handlePak0Upload}
                                    className="hidden"
                                />
                            </label>
                            {pak0Error && (
                                <p className="text-sm text-destructive">{pak0Error}</p>
                            )}
                        </div>
                    ) : prog.stage === "error" ? (
                        <div className="space-y-3">
                            <p className="text-sm text-destructive">
                                {prog.error}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                This is certainly not your fault. Please connect to the server with your desktop game client while we are solving the issue.
                            </p>
                        </div>
                    ) : (
                        <>
                            <Progress value={prog.pct} className="h-2 bg-secondary"/>
                            <div className="text-xs text-muted-foreground mt-2 font-mono">
                                {prog.total
                                    ? `${(prog.received / (1024 * 1024)).toFixed(1)} MB / ${(prog.total / (1024 * 1024)).toFixed(1)} MB`
                                    : `${prog.pct}%`}
                            </div>
                            {prog.etaSeconds !== undefined && prog.stage === "downloading" && (
                                <div className="text-xs text-muted-foreground mt-1 font-mono">
                                    ETA: {prog.etaSeconds}s
                                </div>
                            )}
                            {prog.stage === "downloading" && prog.current?.endsWith("pak0.pk3") && canAbortPak0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    onClick={handleUseOwnPak0}
                                >
                                    <Upload size={16} className="mr-2" />
                                    Use my own pak0.pk3
                                </Button>
                            )}
                        </>
                    )}
                    <div className="text-xs text-muted-foreground mt-2">
                        {tip}
                    </div>
                </Card>
            )}
            {showServerOverlay && (
                <div ref={overlayRef} tabIndex={-1} className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="relative w-full max-w-3xl mx-4">
                        <div className="absolute -top-10 right-0 text-white/70">
                            <small>Press F2 to close</small>
                        </div>
                        {currentServer ? (
                            <ServerCard
                                server={currentServer}
                                hideJoinButton
                            />
                        ) : (
                            <Card className="p-6 text-center text-muted-foreground">
                                Loading server info...
                            </Card>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}
