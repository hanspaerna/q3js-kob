"use client"

import { useState } from "react";
import { Hero } from "@/components/hero";
import { ScoreboardPreview } from "@/components/scoreboard-preview";
import { ServerPicker } from "@/components/server-picker";
import { ScoreboardEntryResponse, ServerResponse, ScoreboardPageResponse, ScoreboardPeriod } from "@/lib/client";

interface HomePageProps {
  initialServers: ServerResponse[];
  scoreboards: Record<ScoreboardPeriod, ScoreboardPageResponse>;
  currentPlayerCount: number;
  totalKillCount: number;
  firstServer: ServerResponse;
  topDailyPlayer: ScoreboardEntryResponse | null;
}

export function HomePage({ initialServers, scoreboards, currentPlayerCount, totalKillCount, firstServer, topDailyPlayer }: HomePageProps) {
  return (
    <>
      <Hero
        currentPlayerCount={currentPlayerCount}
        serverCount={initialServers.length}
        totalKillCount={totalKillCount}
        topDailyPlayer={topDailyPlayer}
        firstServer={firstServer}
      />
      <ScoreboardPreview initialPeriod="DAILY" scoreboards={scoreboards} />
      <ServerPicker servers={initialServers} />
    </>
  );
}