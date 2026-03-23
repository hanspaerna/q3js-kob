import {KillDistributionPointResponse, ScoreboardPeriod} from "@/lib/client";
import {ScoreboardDistributionClient} from "@/components/scoreboard-distribution-client";

export default function ScoreboardDistributionPage(props: {
    data: KillDistributionPointResponse[];
    period: ScoreboardPeriod;
}) {
    return (
        <main className="container mx-auto px-4 py-12 md:py-16">
            <section className="mx-auto max-w-5xl space-y-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">Activity</h1>
                    <p className="text-sm text-muted-foreground md:text-base">
                        Break down reported scoreboard activity by hour or day and compare momentum across each window.
                    </p>
                </div>

                <ScoreboardDistributionClient data={props.data} period={props.period}/>
            </section>
        </main>
    );
}
