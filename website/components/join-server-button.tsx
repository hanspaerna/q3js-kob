"use client";

import {Button} from "@/components/ui/button.tsx";
import {
    Dialog,
    DialogContent,
    DialogTrigger,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Textarea} from "@/components/ui/textarea.tsx";
import {Label} from "@/components/ui/label.tsx";
import {useLocalStorage} from "@/hooks/use-local-storage.ts";
import {ServerResponse} from "@/lib/client";

export function JoinServerButton(props: {
    server: ServerResponse;
    ctaLabel?: string;
    className?: string;
}) {
    const isFull = props.server.info.players >= props.server.info.sv_maxclients;
    const ctaLabel = props.ctaLabel ?? "Join now";

    const [name, setName] = useLocalStorage("name", "Anonymous");
    const [customConfig, setCustomConfig] = useLocalStorage("q3config", "");

    const handleJoin = () => {
        if (!name) return;
        window.location.href = gameUrl;
    };

    if (isFull) {
        return (
            <Button
                size="lg"
                className={`w-full sm:w-auto bg-primary text-primary-foreground font-bold ${
                    props.className ?? ""
                }`.trim()}
                disabled
            >
                Server Full
            </Button>
        );
    }

    const gameUrl = `/game?host=${props.server.host}&proxyPort=${props.server.proxyPort}&name=${encodeURIComponent(
        name
    )}&fs_game=${props.server.info.gamename}`;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    size="lg"
                    className={`w-full sm:w-auto bg-primary text-primary-foreground font-bold ${
                        props.className ?? ""
                    }`.trim()}
                >
                    {ctaLabel}
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Join server</DialogTitle>
                    <DialogDescription>
                        Choose your player name before joining{" "}
                        <span className="font-semibold">
              {props.server.info.sv_hostname}.
            </span><br />
            <strong>Length:</strong> 2-16. Spaces aren't allowed.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 w-full">
                    <div className="space-y-2">
                        <Label htmlFor="player-name">Player name</Label>
                        <div className="flex flex-row items-center">
                            <Input
                                id="player-name"
                                value={name}
                                onChange={(e) => setName(e.target.value.replace(/\s/g, ''))}
                                placeholder="Enter your player name"
                                maxLength={16}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="custom-config">Custom config (optional)</Label>
                        <Textarea
                            id="custom-config"
                            value={customConfig}
                            onChange={(e) => setCustomConfig(e.target.value)}
                            placeholder={"seta cg_fov 110\nseta sensitivity 3"}
                            rows={4}
                            className="resize-y text-xs"
                        />
                        <p className="text-xs text-muted-foreground">
                            Override default settings with Quake 3 console commands. One command per line.
                        </p>
                    </div>
                </div>

                <DialogFooter className="mt-4">
                    <Button className="w-full" size="lg" disabled={!name || name.length < 2} onClick={handleJoin}>
                        {ctaLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
