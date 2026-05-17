"use client"

import { Hero } from "@/components/hero";
import { ScoreboardPreview } from "@/components/scoreboard-preview";
import { ServerPicker } from "@/components/server-picker";
import { ScoreboardEntryResponse, ServerResponse, ScoreboardPageResponse, ScoreboardPeriod } from "@/lib/client";
import { KdScoreboardPageResponse } from "@/lib/scoreboard";

interface HomePageProps {
  initialServers: ServerResponse[];
  scoreboards: Record<ScoreboardPeriod, ScoreboardPageResponse>;
  kdScoreboards: Record<ScoreboardPeriod, KdScoreboardPageResponse>;
  currentPlayerCount: number;
  totalKillCount: number;
  firstServer: ServerResponse;
  topDailyPlayer: ScoreboardEntryResponse | null;
}

export function HomePage({ initialServers, scoreboards, kdScoreboards, currentPlayerCount, totalKillCount, firstServer, topDailyPlayer }: HomePageProps) {
  return (
    <>
      <Hero
        currentPlayerCount={currentPlayerCount}
        serverCount={initialServers.length}
        totalKillCount={totalKillCount}
        topDailyPlayer={topDailyPlayer}
        firstServer={firstServer}
      />
      <ScoreboardPreview initialPeriod="ALL_TIME" scoreboards={scoreboards} kdScoreboards={kdScoreboards} />
      <ServerPicker servers={initialServers} />
    </>
  );
}