import Link from "next/link";
import {Button} from "@/components/ui/button.tsx";
import {BookOpen, Trophy} from "lucide-react";
import {JoinServerButton} from "@/components/join-server-button.tsx";
import {Q3ColoredText} from "@/components/q3-colored-text.tsx";
import {ScoreboardEntryResponse, ServerResponse} from "@/lib/client";
import {
    Dialog,
    DialogContent,
    DialogTrigger,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog.tsx";


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
        <section className="border-border/60 bg-background">
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

                    <div className="mt-6 mx-auto flex max-w-md flex-col gap-3">
                        <div className="grid grid-cols-2 gap-3">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="secondary" size="lg" className="w-full">
                                        <BookOpen className="h-4 w-4 mr-2" />
                                        Guide
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-lg p-8">
                                    <DialogHeader>
                                        <DialogTitle className="text-xl">Quick Guide</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 text-base py-4">
                                        <p>
                                            You can play on our server directly from this page, but we recommend you to use your own pak0.pk3 from legally acquired Quake 3 Arena.
                                            We are not allowed to share it, and the file you upload remains on your machine. 
                                            pak0.pk3 from demo files is possible to use but not recommended, as you will see missing textures here and there even on 3rd party maps we're mostly playing with. 
                                            And would you ever want to play Q3A without Bones anyway?
                                        </p>
                                        <p>
                                            Use <strong>F1</strong> instead of Esc to open game menu while staying in fullscreen mode.
                                        </p>
                                        <p>
                                            Press <strong>F2</strong> to open an in-game server overlay (useful for admins).
                                        </p>
                                        <p>
                                            Press <strong>H</strong> in-game to shout after killing (or being killed by) someone.
                                        </p>
                                        <p>
                                            Press <strong>C</strong> to crouch.
                                        </p>
                                        <p>
                                            Feel free to specify your own quake3 cfg in the custom field before joining the game.
                                        </p>
                                        <p>
                                            You can visit <Link href="/storage" className="text-primary hover:underline"><strong>Storage</strong></Link> page to manage your local client installation.
                                        </p>
                                        <p>
                                            Still not convinced that it's a good idea to play from browser? Then join us directly over UDP (port 27960) from your own CPMA client. But you'll miss our cool custom skins like a huge black spider, or a pig-faced Marilyn Manson that makes an unforgettable sound when drowning. 
                                        </p>
                                        <p>
                                            Respectfully yours...
                                        </p>
                                    </div>
                                </DialogContent>
                            </Dialog>
                            <Button variant="secondary" size="lg" className="w-full" asChild>
                                <Link href="/scoreboard">
                                    <Trophy className="h-4 w-4 mr-2" />
                                    Scoreboard
                                </Link>
                            </Button>
                        </div>
                        {props.firstServer ? (
                            <JoinServerButton server={props.firstServer} ctaLabel={"Play"} className="w-full" />
                        ) : (
                            <Button size="lg" className="w-full" asChild>
                                <Link href="#server-browser">Play</Link>
                            </Button>
                        )}
                    </div>

                    <div className="mt-8 grid gap-3 text-left md:grid-cols-3">
                        <div className="border border-border/70 bg-card/40 px-4 py-4">
                            <div
                                className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                Players Online
                            </div>
                            <div className="mt-2 text-2xl font-bold leading-none text-foreground">
                                {formatNumber(props.currentPlayerCount)}
                            </div>
                        </div>

                        <div className="border border-border/70 bg-card/40 px-4 py-4">
                            <div
                                className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
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
                        </div>

                        <div className="border border-border/70 bg-card/40 px-4 py-4">
                            <div
                                className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                Total Frags Ever
                            </div>
                            <div className="mt-2 text-2xl font-bold leading-none text-foreground">
                                {formatNumber(props.totalKillCount)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
