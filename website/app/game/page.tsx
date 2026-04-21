import GamePage from "@/views/game-page";
import {Suspense} from "react";

import fs from 'fs';
import { BASEQ3_DIR } from "@/lib/constants";

export default function GameRoute() {
    let customPlayerModels: string[] = [];

    // get a list of all custom player models from server's baseq3 folder (used for any fs_game, not only vanilla)
    if (fs.existsSync(BASEQ3_DIR)) {
        customPlayerModels = fs.readdirSync(BASEQ3_DIR).filter(file => file.startsWith('model-') && file.endsWith('.pk3'));
    }

    return (
        <Suspense fallback={null}>
            <GamePage customPlayerModels={customPlayerModels}/>
        </Suspense>
    );
}
