"use client";

import {Card, CardContent} from "@/components/ui/card.tsx";
import {Button} from "@/components/ui/button.tsx";
import Link from "next/link";
import {
    buildScoreboardHref,
    DEFAULT_SCOREBOARD_PAGE,
    DEFAULT_SCOREBOARD_MODE,
    KdScoreboardEntryResponse,
    KdScoreboardPageResponse,
    SCOREBOARD_PERIOD_LABELS,
    ScoreboardMode,
} from "@/lib/scoreboard.ts";
import {useState} from "react";
import {Q3ColoredText} from "@/components/q3-colored-text.tsx";
import {ScoreboardPeriodToggle} from "@/components/scoreboard-period-toggle.tsx";
import {ScoreboardModeToggle} from "@/components/scoreboard-mode-toggle.tsx";
import {ScoreboardPageResponse, ScoreboardPeriod} from "@/lib/client";
import {formatCompactLastOnline} from "@/lib/last-online";

function formatKills(kills: number) {
    return new Intl.NumberFormat().format(kills);
}

function formatKdRatio(ratio: number | null | undefined) {
    if (ratio == null) return "—";
    return ratio.toFixed(2);
}

export function ScoreboardPreview(props: {
    scoreboards: Record<ScoreboardPeriod, ScoreboardPageResponse>;
    kdScoreboards: Record<ScoreboardPeriod, KdScoreboardPageResponse>;
    initialPeriod?: ScoreboardPeriod;
    initialMode?: ScoreboardMode;
}) {
    const initialPeriod = props.initialPeriod ?? "ALL_TIME";
    const initialMode = props.initialMode ?? DEFAULT_SCOREBOARD_MODE;
    const [period, setPeriod] = useState<ScoreboardPeriod>(initialPeriod);
    const [mode, setMode] = useState<ScoreboardMode>(initialMode);

    const topFraggers = mode === "kd"
        ? props.kdScoreboards[period]?.entries ?? []
        : props.scoreboards[period]?.entries ?? [];

    function selectPeriod(nextPeriod: ScoreboardPeriod) {
        if (nextPeriod === period) return;
        setPeriod(nextPeriod);
    }

    function selectMode(nextMode: ScoreboardMode) {
        if (nextMode === mode) return;
        if (nextMode === "kd" && period === "DAILY") setPeriod("ALL_TIME");
        else if (nextMode === "kills") setPeriod("DAILY");
        setMode(nextMode);
    }

    const periodLabel = SCOREBOARD_PERIOD_LABELS[period].toLowerCase();

    return (
        <section className="container mx-auto px-4 pb-8">
            <div className="mx-auto max-w-5xl">
                <Card className="border-border/60 bg-card/60">
                    <CardContent className="p-4 md:p-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">
                                    {mode === "kd" ? "Best K/D Ratios" : "Top Fraggers"}
                                </h2>
                            </div>
                            <div className="flex flex-wrap items-start gap-2 md:items-end">
                                <ScoreboardModeToggle mode={mode} onChange={selectMode}/>
                                <ScoreboardPeriodToggle period={period} onChange={selectPeriod} mode={mode}/>
                            </div>
                        </div>

                        <div className="mt-4 border-t border-border/50">
                            {topFraggers.length === 0 && (
                                <div className="px-2 py-6 text-sm text-muted-foreground">
                                    No {periodLabel} frag events recorded yet.
                                </div>
                            )}

                            {topFraggers.length > 0 && (
                                <div className="divide-y divide-border/40">
                                    {topFraggers.map((entry, index) => (
                                        <div
                                            key={`${entry.playerName}-${index}`}
                                            className="grid grid-cols-[56px_1fr_100px] items-center gap-3 px-2 py-3 text-sm"
                                        >
                                            <span className="text-muted-foreground">#{index + 1}</span>
                                            <div className="min-w-0">
                                                <Link
                                                    href={`/players/${encodeURIComponent(entry.playerName)}`}
                                                    className="block truncate font-semibold hover:text-primary transition-colors"
                                                >
                                                    <Q3ColoredText text={entry.playerName}/>
                                                </Link>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    Last online {formatCompactLastOnline(entry.lastOnline)}
                                                </p>
                                            </div>
                                            <span className="text-right tabular-nums">
                                                {mode === "kd"
                                                    ? formatKdRatio((entry as KdScoreboardEntryResponse).killDeathRatio)
                                                    : formatKills(entry.kills)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 flex justify-start border-t border-border/50 pt-4 md:justify-end">
                            <Button variant="outline" asChild>
                                <Link href={buildScoreboardHref(period, DEFAULT_SCOREBOARD_PAGE, undefined, mode)}>
                                    View full scoreboard
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}
