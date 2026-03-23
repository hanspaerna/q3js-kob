"use client";

import {Card, CardContent} from "@/components/ui/card";
import {ServerCard} from "@/components/server-card.tsx";
import {useMemo, useState, useTransition} from "react";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {stripQ3Colors} from "@/lib/utils.ts";
import Link from "next/link";
import {Search} from "lucide-react";
import {ServerResponse} from "@/lib/client";
import {useRouter} from "next/navigation";

interface ServerPickerProps {
  servers: ServerResponse[];
  mobileControlsEnabled: boolean;
}

function formatCount(count: number, singular: string, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`;
}

export function ServerPicker({servers, mobileControlsEnabled}: ServerPickerProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isRefreshing, startRefreshTransition] = useTransition();
    const router = useRouter();

    const filteredServers = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return servers.filter((server) => {
            const hostname = stripQ3Colors(server.info.sv_hostname).toLowerCase();
            const mapname = server.info.mapname.toLowerCase();

            return normalizedSearch.length === 0 ||
                hostname.includes(normalizedSearch) ||
                mapname.includes(normalizedSearch);
        });
    }, [servers, searchTerm]);

    const totalPlayerCount = useMemo(
        () => servers.reduce((sum, server) => sum + server.info.players, 0),
        [servers]
    );

    const filteredPlayerCount = useMemo(
        () => filteredServers.reduce((sum, server) => sum + server.info.players, 0),
        [filteredServers]
    );
    const activeFilterCount = [searchTerm.trim().length > 0].filter(Boolean).length;

    function clearFilters() {
        setSearchTerm("");
    }

    function refreshServerList() {
        startRefreshTransition(() => {
            router.refresh();
        });
    }

    return (
        <section id="server-browser" className="container mx-auto px-4 pb-24 scroll-mt-24">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="grid gap-4">
                    {filteredServers.map((server) => (
                        <ServerCard
                            key={`${server.host}:${server.proxyPort}`}
                            server={server}
                            mobileControlsEnabled={mobileControlsEnabled}
                        />
                    ))}
                </div>

                {servers.length === 0 && (
                    <Card className="bg-card/50 border-border/50">
                        <CardContent className="py-10 text-center space-y-3">
                            <p className="text-muted-foreground">No servers are live right now.</p>
                            <div className="flex items-center justify-center gap-2">
                                <Button variant="outline" onClick={refreshServerList} disabled={isRefreshing}>
                                    {isRefreshing ? "Refreshing..." : "Refresh list"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {servers.length > 0 && filteredServers.length === 0 && (
                    <Card className="bg-card/50 border-border/50">
                        <CardContent className="py-10 text-center space-y-3">
                            <p className="text-muted-foreground">No servers match your current filters.</p>
                            <div className="flex items-center justify-center gap-2">
                                <Button variant="outline" onClick={clearFilters}>
                                    Clear filters
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={refreshServerList}
                                    disabled={isRefreshing}
                                >
                                    {isRefreshing ? "Refreshing..." : "Refresh list"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </section>
    );
}
