import ScoreboardPage from "@/views/scoreboard-page";
import {getInitialScoreboard, getInitialKdScoreboard} from "@/lib/initial-data";
import {
    DEFAULT_SCOREBOARD_PAGE,
    DEFAULT_SCOREBOARD_PERIOD,
    DEFAULT_SCOREBOARD_MODE,
    parseScoreboardPage,
    parseScoreboardPeriod,
    parseScoreboardSearch,
    parseScoreboardMode,
    SCOREBOARD_PAGE_SIZE,
} from "@/lib/scoreboard";

type ScoreboardSearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function ScoreboardPageContent(props: {searchParams: ScoreboardSearchParams}) {
    const searchParams = await props.searchParams;
    const period = parseScoreboardPeriod(searchParams.period, DEFAULT_SCOREBOARD_PERIOD);
    const page = parseScoreboardPage(searchParams.page, DEFAULT_SCOREBOARD_PAGE);
    const search = parseScoreboardSearch(searchParams.search);
    const mode = parseScoreboardMode(searchParams.mode, DEFAULT_SCOREBOARD_MODE);

    const scoreboard = mode === "kd"
        ? await getInitialKdScoreboard(period, {page, pageSize: SCOREBOARD_PAGE_SIZE, search})
        : await getInitialScoreboard(period, {page, pageSize: SCOREBOARD_PAGE_SIZE, search});

    return <ScoreboardPage scoreboard={scoreboard} search={search} mode={mode}/>;
}
