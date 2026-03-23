import GamePage from "@/views/game-page";
import {Suspense} from "react";

export default function GameRoute() {
    return (
        <Suspense fallback={null}>
            <GamePage/>
        </Suspense>
    );
}
