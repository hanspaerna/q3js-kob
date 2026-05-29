import {GAME_TYPES} from "@/lib/q3.ts";
import {Card, CardContent} from "@/components/ui/card.tsx";
import {Activity, Globe, Lock, Map, Server, Users} from "lucide-react";
import {Badge} from "@/components/ui/badge.tsx";
import {getPercentage, getPingColor} from "@/lib/utils.ts";
import {JoinServerButton} from "@/components/join-server-button.tsx";
import {ChatButton} from "@/components/chat-overlay.tsx";
import {PlayerList} from "@/components/player-list.tsx";
import {ServerAdminControls} from "@/components/server-admin-controls.tsx";
import {MapQueue} from "@/components/map-queue.tsx";
import {ServerResponse} from "@/lib/client";

export function ServerCard(props: {
    server: ServerResponse;
    hideJoinButton?: boolean;
}) {
    const info = props.server.info;

    const sortedUsers = [...info.users].sort((a, b) => b.score - a.score);

    return (
        <Card className="bg-card/50 border-border/50 hover:border-primary/50 transition-all">
            <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-lg font-bold text-foreground break-words">
                                        {info.sv_hostname}
                                    </h3>
                                    {info.g_needpass === 1 && (
                                        <Lock className="h-4 w-4 text-muted-foreground"/>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <Badge
                                        variant="outline"
                                        className="text-xs border-border/50 text-muted-foreground"
                                    >
                                        <Server className="h-3 w-3 mr-1"/> {props.server.host}:{props.server.targetPort}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className="text-xs border-border/50 text-muted-foreground"
                                    >
                                        <Globe className="h-3 w-3 mr-1"/> {info.location ?? "Unknown"}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className="text-xs border-border/50 text-muted-foreground"
                                    >
                                        Map: {info.mapname.toUpperCase()}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs border-border/50 text-muted-foreground">
                                        Mode: {info.modeCurrent}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs border-border/50 text-muted-foreground">
                                        {GAME_TYPES[info.g_gametype] || "Unknown"}
                                    </Badge>
                                    {(info.g_gametype === 3 || info.g_gametype === 4) && (
                                        <Badge variant="outline" className="text-xs border-border/50">
                                            <span className="text-red-500">{info.scoreRed}</span>
                                            <span className="text-muted-foreground mx-1">:</span>
                                            <span className="text-blue-500">{info.scoreBlue}</span>
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {!props.hideJoinButton && (
                                <div className="flex items-center gap-2 sm:self-start">
                                    {props.server.host && props.server.targetPort && (
                                        <ChatButton
                                            serverHost={props.server.host}
                                            serverPort={props.server.targetPort}
                                        />
                                    )}
                                    <JoinServerButton
                                        server={props.server}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground"/>
                                <span className="text-foreground">
                                    {info.players}/{info.sv_maxclients}
                                </span>
                                <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary rounded-full"
                                        style={{
                                            width: `${getPercentage(
                                                info.players,
                                                info.sv_maxclients
                                            )}%`
                                        }}
                                    />
                                </div>
                            </div>
                            {info.ping !== undefined && (
                                <div className="flex items-center gap-2">
                                    <Activity className={`h-4 w-4 ${getPingColor(info.ping)}`}/>
                                    <span className={`${getPingColor(info.ping)}`}>
                                        {info.ping}ms
                                    </span>
                                </div>
                            )}
                        </div>

                        {props.server.host && props.server.targetPort && (
                            <ServerAdminControls
                                host={props.server.host}
                                port={props.server.targetPort}
                                fraglimit={20}
                                timelimit={0}
                                gametype={info.g_gametype}
                            />
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <PlayerList
                                    users={sortedUsers}
                                    host={props.server.host}
                                    port={props.server.targetPort}
                                />
                            </div>
                            <div className="mt-4 border-t border-border/50 pt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Map className="h-4 w-4"/>
                                        <span className="font-semibold text-foreground">
                                            Map Queue
                                        </span>
                                    </div>
                                </div>
                                {props.server.host && props.server.targetPort && (
                                    <MapQueue
                                        host={props.server.host}
                                        port={props.server.targetPort}
                                        currentMap={info.mapname}
                                        gamemode={info.g_gametype}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
