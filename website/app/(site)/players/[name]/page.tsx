import PlayerProfilePage from "@/views/player-profile-page";
import {fetchPlayerStats} from "@/lib/player-stats.tsx";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type PlayerProfileRouteProps = {
    params: Promise<{ name: string }>;
};

function decodePlayerName(value: string) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

export default async function PlayerProfileRoute(props: PlayerProfileRouteProps) {
    const params = await props.params;
    const playerName = decodePlayerName(params.name);
    const stats = await fetchPlayerStats(playerName);

    return <PlayerProfilePage playerName={playerName} period="ALL_TIME" stats={stats}/>;
}
