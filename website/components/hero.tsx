import Link from "next/link";
import {Button} from "@/components/ui/button.tsx";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {Skull, Target, Users} from "lucide-react";
import {JoinServerButton} from "@/components/join-server-button.tsx";
import {Q3ColoredText} from "@/components/q3-colored-text.tsx";
import {ScoreboardEntryResponse, ServerResponse} from "@/lib/client";


function formatCount(count: number, singular: string, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`;
}

function formatNumber(value: number) {
    return new Intl.NumberFormat().format(value);
}

export function Hero(props: {
    currentPlayerCount: number;
    serverCount: number;
    totalKillCount: number;
    topDailyPlayer: ScoreboardEntryResponse | null;
    firstServer?: ServerResponse;
}) {
    return (
        <section className="border-b border-border/60 bg-background">
            <div className="container mx-auto px-4 py-14 md:py-14">
                <div className="mx-auto max-w-4xl text-center">
                    <div className="mt-8 flex flex-col items-center gap-3">
                        <i>
                            <p className="text-left">
                                Лижи макет шершавой плоти,<br />
                                Вервольф с звезды Ольдеборан,<br />
                                Ты, может, выжил при Пол Поте,<br />
                                Но мой сильнее раилган.<br />
                                <br />
                            </p>
                            <p className="text-right">
                                В. П. Пидоренко
                            </p>
                        </i>
                    </div>

                    <div className="mt-6 mx-auto grid max-w-md grid-cols-2 gap-3">
                        {props.firstServer ? (
                            <JoinServerButton server={props.firstServer} ctaLabel={"Play"}/>
                        ) : (
                            <Button size="lg" className="w-full" asChild>
                                <Link href="#server-browser">Play</Link>
                            </Button>
                        )}
                        <Button variant="secondary" size="lg" className="w-full" asChild>
                            <Link href="/scoreboard">Scoreboard</Link>
                        </Button>
                    </div>

                    <div className="mt-8 flex flex-col items-center gap-3 text-center">
                        <p>
                            Press <strong>Shift+F</strong> in-game to enable fullscreen mode.
                        </p>
                        <p>
                            Press <strong>H</strong> in-game to shout after killing (or being killed by) someone.
                        </p>
                    </div>

                    <div className="mt-8 grid gap-3 text-left md:grid-cols-3">
                        <div className="border border-border/70 bg-card/40 px-4 py-4">
                            <div
                                className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                <Users className="h-4 w-4 text-primary"/>
                                Players Online
                            </div>
                            <div className="mt-2 text-2xl font-bold leading-none text-foreground">
                                {formatNumber(props.currentPlayerCount)}
                            </div>
                            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                Across {formatCount(props.serverCount, "live server")}
                            </p>
                        </div>

                        <div className="border border-border/70 bg-card/40 px-4 py-4">
                            <div
                                className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                <Target className="h-4 w-4 text-primary"/>
                                Most Frags Last 24 Hours
                            </div>
                            <div className="mt-2 text-xl font-bold leading-none text-foreground">
                                {props.topDailyPlayer ? (
                                    <Link
                                        href={`/players/${encodeURIComponent(props.topDailyPlayer.playerName)}`}
                                        className="hover:text-primary transition-colors"
                                    >
                                        <Q3ColoredText text={props.topDailyPlayer.playerName}/>
                                    </Link>
                                ) : (
                                    "No frags yet"
                                )}
                            </div>
                            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                {props.topDailyPlayer
                                    ? `${formatNumber(props.topDailyPlayer.kills)} frags in the last 24 hours`
                                    : "Last 24 hours scoreboard is empty"}
                            </p>
                        </div>

                        <div className="border border-border/70 bg-card/40 px-4 py-4">
                            <div
                                className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                <Skull className="h-4 w-4 text-primary"/>
                                Total Frags Ever
                            </div>
                            <div className="mt-2 text-2xl font-bold leading-none text-foreground">
                                {formatNumber(props.totalKillCount)}
                            </div>
                            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                Global scoreboard total
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
