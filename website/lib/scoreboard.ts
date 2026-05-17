import {
    KdScoreboardEntryResponse,
    KdScoreboardPageResponse,
    ScoreboardEntryResponse,
    ScoreboardPeriod,
} from "@/lib/client";
import {stripQ3Colors} from "@/lib/utils";

// Re-export types from generated client
export type {KdScoreboardEntryResponse, KdScoreboardPageResponse};

export const SCOREBOARD_PERIODS = Object.values(ScoreboardPeriod) as ScoreboardPeriod[];
export const DEFAULT_SCOREBOARD_PERIOD: ScoreboardPeriod = "ALL_TIME";
export const DEFAULT_SCOREBOARD_PAGE = 1;
export const SCOREBOARD_PAGE_SIZE = 25;
export const SCOREBOARD_PREVIEW_PAGE_SIZE = 5;

// Scoreboard mode: kills or K/D ratio
export type ScoreboardMode = "kills" | "kd";
export const SCOREBOARD_MODES: ScoreboardMode[] = ["kd", "kills"];
export const DEFAULT_SCOREBOARD_MODE: ScoreboardMode = "kd";

export const SCOREBOARD_MODE_LABELS: Record<ScoreboardMode, string> = {
    kills: "Frags",
    kd: "K/D Ratio",
};

export const SCOREBOARD_PERIOD_LABELS: Record<ScoreboardPeriod, string> = {
    DAILY: "Last 24 Hours",
    WEEKLY: "Weekly",
    MONTHLY: "Monthly",
    ALL_TIME: "All Time",
};

function firstQueryValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

export function parseScoreboardPeriod(
    value: string | string[] | undefined,
    fallback: ScoreboardPeriod = DEFAULT_SCOREBOARD_PERIOD,
) {
    const candidate = firstQueryValue(value);

    if (candidate && SCOREBOARD_PERIODS.includes(candidate as ScoreboardPeriod)) {
        return candidate as ScoreboardPeriod;
    }

    return fallback;
}

export function parseScoreboardPage(
    value: string | string[] | undefined,
    fallback: number = DEFAULT_SCOREBOARD_PAGE,
) {
    const candidate = firstQueryValue(value);

    if (!candidate) {
        return fallback;
    }

    const parsed = Number.parseInt(candidate, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseScoreboardSearch(value: string | string[] | undefined) {
    const candidate = firstQueryValue(value)?.trim();
    return candidate ?? "";
}

export function parseScoreboardMode(
    value: string | string[] | undefined,
    fallback: ScoreboardMode = DEFAULT_SCOREBOARD_MODE,
): ScoreboardMode {
    const candidate = firstQueryValue(value);

    if (candidate && SCOREBOARD_MODES.includes(candidate as ScoreboardMode)) {
        return candidate as ScoreboardMode;
    }

    return fallback;
}

export function buildScoreboardHref(
    period: ScoreboardPeriod,
    page: number = DEFAULT_SCOREBOARD_PAGE,
    search?: string,
    mode: ScoreboardMode = DEFAULT_SCOREBOARD_MODE,
) {
    const params = new URLSearchParams({period});
    const normalizedSearch = search?.trim() ?? "";

    if (page > DEFAULT_SCOREBOARD_PAGE) {
        params.set("page", String(page));
    }

    if (normalizedSearch.length > 0) {
        params.set("search", normalizedSearch);
    }

    if (mode !== DEFAULT_SCOREBOARD_MODE) {
        params.set("mode", mode);
    }

    return `/scoreboard?${params.toString()}`;
}

export function buildScoreboardDistributionHref(period: ScoreboardPeriod) {
    const params = new URLSearchParams({period});
    return `/scoreboard/distribution?${params.toString()}`;
}

export function sortScoreboardEntries(entries: ScoreboardEntryResponse[]) {
    return [...entries].sort((a, b) => {
        if (b.kills !== a.kills) return b.kills - a.kills;
        return stripQ3Colors(a.playerName).localeCompare(stripQ3Colors(b.playerName));
    });
}
