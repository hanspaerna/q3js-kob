import {Suspense} from "react";
import {Card, CardContent} from "@/components/ui/card";
import {ScoreboardDistributionPageContent} from "@/components/scoreboard-distribution-page-content";


function ScoreboardDistributionPageSkeleton() {
    return (
        <main className="container mx-auto px-4 py-12 md:py-16">
            <section className="mx-auto max-w-5xl space-y-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">Activity</h1>
                </div>

                <Card className="border-border/60 bg-card/60">
                    <CardContent className="space-y-4 p-4">
                        <div className="h-10 w-full animate-pulse bg-muted"/>
                        <div className="h-80 w-full animate-pulse bg-muted"/>
                    </CardContent>
                </Card>
            </section>
        </main>
    );
}

type ScoreboardDistributionSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function ScoreboardDistributionRoute(props: {
    searchParams: ScoreboardDistributionSearchParams;
}) {
    return (
        <Suspense fallback={<ScoreboardDistributionPageSkeleton/>}>
            <ScoreboardDistributionPageContent searchParams={props.searchParams}/>
        </Suspense>
    );
}
