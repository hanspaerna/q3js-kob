import {ScoreboardClient} from "@/components/scoreboard-client";
import {ScoreboardPageResponse} from "@/lib/client";
import {KdScoreboardPageResponse, ScoreboardMode} from "@/lib/scoreboard";

export default function ScoreboardPage(props: {
    scoreboard: ScoreboardPageResponse | KdScoreboardPageResponse;
    search: string;
    mode: ScoreboardMode;
}) {
    return (
        <main className="container mx-auto px-4 py-12 md:py-16">
            <section className="mx-auto max-w-5xl space-y-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">Scoreboard</h1>
                </div>

                <ScoreboardClient
                    search={props.search}
                    scoreboard={props.scoreboard}
                    mode={props.mode}
                />
            </section>
        </main>
    );
}
