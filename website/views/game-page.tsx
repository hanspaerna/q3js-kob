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
import {Upload} from "lucide-react";

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
};

const STAGE_TIPS: Record<Prog["stage"], string> = {
    initializing: "Tip: Press Shift+F to toggle fullscreen.",
    needs_pak0: "You can find pak0.pk3 in your Quake 3 Arena installation folder.",
    downloading: "Tip: Assets are cached after first load.",
    launching: "Tip: Press H in-game to shout.",
    ready: "Tip: If sound is muted, click the page once.",
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

    const searchParams = useSearchParams();
    const host = searchParams?.get("host") ?? "";
    const proxyPort = toInt(searchParams?.get("proxyPort") ?? undefined, 0);
    const name = searchParams?.get("name") ?? "Player";
    const fsGame = searchParams?.get("fs_game") ?? "baseq3";
    const canStartGame = Boolean(host && proxyPort);
    const gameStartKey = `${host}|${proxyPort}|${name}|${fsGame}|desktop}`;

    const onNeedPak0 = useCallback(() => {
        return new Promise<Uint8Array>((resolve) => {
            pak0ResolverRef.current = resolve;
        });
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
            onNeedPak0
        });
    }, [canStartGame, fsGame, gameStartKey, host, name, proxyPort, rafUpdate, onNeedPak0, customPlayerModels]);

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
        }[prog.stage]
        : "Preparing downloads";

    // fix an issue with mouse pointer not getting captured back by ioquake3 after Alt+Tab or Escape
    useEffect(() => {
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        if (!canvas) return;

        // suppress ioquake3 from releasing pointer lock
        const originalExit = document.exitPointerLock.bind(document);
        document.exitPointerLock = () => {
            console.warn('exitPointerLock suppressed');
        };

        // since ioquake3 won't re-request it either, we do it ourselves
        const handleClick = () => {
            if (document.pointerLockElement !== canvas) {
                canvas.requestPointerLock({ unadjustedMovement: true });
            }
        };

        canvas.addEventListener('click', handleClick);

        return () => {
            document.exitPointerLock = originalExit;
            canvas.removeEventListener('click', handleClick);
        };
    }, []);

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
                        </>
                    )}
                    <div className="text-xs text-muted-foreground mt-2">
                        {tip}
                    </div>
                </Card>
            )}
        </main>
    );
}
