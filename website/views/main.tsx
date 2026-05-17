import {getInitialScoreboards, getInitialServers, getInitialKdScoreboards} from "@/lib/initial-data.tsx";
import {SCOREBOARD_PERIODS, SCOREBOARD_PREVIEW_PAGE_SIZE} from "@/lib/scoreboard";
import { HomePage } from "./home-page";

export default async function Main() {
    const [initialServers, scoreboards, kdScoreboards] = await Promise.all([
      getInitialServers(),
      getInitialScoreboards(SCOREBOARD_PERIODS, {pageSize: SCOREBOARD_PREVIEW_PAGE_SIZE}),
      getInitialKdScoreboards(SCOREBOARD_PERIODS, {pageSize: SCOREBOARD_PREVIEW_PAGE_SIZE}),
    ]);

    const currentPlayerCount = initialServers.reduce((sum, server) => sum + server.info.players, 0);
    const totalKillCount = scoreboards.ALL_TIME.totalKills;
    const firstServer = initialServers[0];
    const topDailyPlayer = scoreboards.DAILY.entries[0] ?? null;

    return (
        <main>
            <HomePage
                initialServers={initialServers}
                scoreboards={scoreboards}
                kdScoreboards={kdScoreboards}
                currentPlayerCount={currentPlayerCount}
                totalKillCount={totalKillCount}
                firstServer={firstServer}
                topDailyPlayer={topDailyPlayer}
            />
        </main>
    )
}
