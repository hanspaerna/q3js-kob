import PlayerSearchPage from "@/views/player-search-page";
import {getAllPlayers, PlayerResponse} from "@/lib/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type PlayerSearchParams = Promise<Record<string, string | string[] | undefined>>;

function getQueryValue(value: string | string[] | undefined) {
    if (Array.isArray(value)) {
        return value[0]?.trim() ?? "";
    }

    return value?.trim() ?? "";
}

async function searchPlayers(query: string) {
    if (query.length === 0) {
        return [] satisfies PlayerResponse[];
    }

    const {data} = await getAllPlayers({
        query: {
            search: query,
        },
        throwOnError: true,
    });

    return data;
}

export default async function PlayersRoute(props: {searchParams: PlayerSearchParams}) {
    const searchParams = await props.searchParams;
    const query = getQueryValue(searchParams.q);
    const players = await searchPlayers(query);

    return <PlayerSearchPage query={query} players={players}/>;
}
