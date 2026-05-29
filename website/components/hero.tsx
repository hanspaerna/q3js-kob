import Link from "next/link";
import {Q3ColoredText} from "@/components/q3-colored-text.tsx";
import {ScoreboardEntryResponse} from "@/lib/client";

function formatNumber(value: number) {
    return new Intl.NumberFormat().format(value);
}

export function Hero(props: {
    currentPlayerCount: number;
    serverCount: number;
    totalKillCount: number;
    topDailyPlayer: ScoreboardEntryResponse | null;
}) {
    return (
        <section className="bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="mx-auto max-w-4xl">
                    <div className="grid gap-px text-center md:grid-cols-3 border border-border/60">
                        <div className="bg-card px-4 py-5">
                            <div className="text-xs uppercase tracking-[0.2em] text-secondary-foreground">
                                Players Online
                            </div>
                            <div className="mt-2 text-3xl font-bold leading-none text-primary font-sans">
                                {formatNumber(props.currentPlayerCount)}
                            </div>
                        </div>

                        <div className="bg-card px-4 py-5 border-x border-border/60">
                            <div className="text-xs uppercase tracking-[0.2em] text-secondary-foreground">
                                Most Frags Last 24h
                            </div>
                            <div className="mt-2 text-3xl font-bold leading-none text-foreground font-sans">
                                {props.topDailyPlayer ? (
                                    <Link
                                        href={`/players/${encodeURIComponent(props.topDailyPlayer.playerName)}`}
                                        className="hover:text-primary transition-colors"
                                    >
                                        <Q3ColoredText text={props.topDailyPlayer.playerName}/>
                                    </Link>
                                ) : (
                                    <span className="text-muted-foreground">NO FRAGS YET</span>
                                )}
                            </div>
                        </div>

                        <div className="bg-card px-4 py-5">
                            <div className="text-xs uppercase tracking-[0.2em] text-secondary-foreground">
                                Total Frags Ever
                            </div>
                            <div className="mt-2 text-3xl font-bold leading-none text-primary font-sans">
                                {formatNumber(props.totalKillCount)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
