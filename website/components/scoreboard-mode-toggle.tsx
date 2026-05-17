"use client";

import {Button} from "@/components/ui/button.tsx";
import {SCOREBOARD_MODE_LABELS, SCOREBOARD_MODES, ScoreboardMode} from "@/lib/scoreboard.ts";
import {cn} from "@/lib/utils.ts";

type ScoreboardModeToggleProps = {
    mode: ScoreboardMode;
    onChange: (mode: ScoreboardMode) => void;
};

export function ScoreboardModeToggle({mode, onChange}: ScoreboardModeToggleProps) {
    return (
        <div
            className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-border/60 bg-background/70 p-1">
            {SCOREBOARD_MODES.map((m) => (
                <Button
                    key={m}
                    type="button"
                    size="sm"
                    variant={mode === m ? "secondary" : "ghost"}
                    className={cn("min-w-20", mode === m && "shadow-none")}
                    aria-pressed={mode === m}
                    onClick={() => onChange(m)}
                >
                    {SCOREBOARD_MODE_LABELS[m]}
                </Button>
            ))}
        </div>
    );
}
