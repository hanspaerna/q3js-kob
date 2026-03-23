import {ScoreboardClient} from "@/components/scoreboard-client";
import {ScoreboardPageResponse} from "@/lib/client";

export default function ScoreboardPage(props: {
    scoreboard: ScoreboardPageResponse;
    search: string;
}) {
    return (
        <main className="container mx-auto px-4 py-12 md:py-16">
            <section className="mx-auto max-w-5xl space-y-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">Global Scoreboard</h1>
                    <p className="text-sm text-muted-foreground md:text-base">
                        Switch between last 24 hours, weekly, monthly, and all-time frags across reported servers.
                    </p>
                </div>

                <ScoreboardClient
                    search={props.search}
                    scoreboard={props.scoreboard}
                />
            </section>
        </main>
    );
}
