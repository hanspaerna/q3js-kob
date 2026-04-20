import GamePage from "@/views/game-page";
import {Suspense} from "react";

import fs from 'fs';

export default function GameRoute() {
    const baseq3ServerPath = "/app/public/baseq3";
    let customPlayerModels: string[] = [];

    // get a list of all custom player models from server's baseq3 folder (used for any fs_game, not only vanilla)
    if (fs.existsSync(baseq3ServerPath)) {
        customPlayerModels = fs.readdirSync(baseq3ServerPath).filter(file => file.startsWith('model-') && file.endsWith('.pk3'));
    }

    return (
        <Suspense fallback={null}>
            <GamePage customPlayerModels={customPlayerModels}/>
        </Suspense>
    );
}
