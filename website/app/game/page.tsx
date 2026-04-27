import GamePage from "@/views/game-page";
import {Suspense} from "react";
import fs from 'fs';
import { CPMA_DIR } from "@/lib/constants";

export default function GameRoute() {
    let customPlayerModelsCpma: string[] = [];

    // get a list of all custom player models from server's baseq3 folder (used for any fs_game, not only vanilla)
    if (fs.existsSync(CPMA_DIR)) {
        customPlayerModelsCpma = fs.readdirSync(CPMA_DIR).filter(file => file.startsWith('model-') && file.endsWith('.pk3'));
    }

    return (
        <Suspense fallback={null}>
            <GamePage customPlayerModelsCpma={customPlayerModelsCpma}/>
        </Suspense>
    );
}
