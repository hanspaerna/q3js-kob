"use client";

import Link from "next/link";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogTrigger,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {useQuery} from "@tanstack/react-query";
import {getAllServersOptions} from "@/lib/client/@tanstack/react-query.gen";
import {useLocalStorage} from "@/hooks/use-local-storage";
import {BookOpen, MenuIcon, Trophy} from "lucide-react";
import {cn, getClientEnv} from "@/lib/utils";
import {PwaInstallControl} from "@/components/pwa-install-control";
import {JoinServerButton} from "@/components/join-server-button";
import {useSession, signIn, signOut} from "next-auth/react";
import {useState, useEffect} from "react";
import {hasManagerAccess} from "@/lib/auth";

const STATUS_STYLES = {
    offline: {
        badgeClassName: "border-destructive/50 text-destructive",
        dotClassName: "bg-destructive",
    },
    online: {
        badgeClassName: "border-primary/50 text-primary",
        dotClassName: "bg-primary animate-pulse",
    },
    pending: {
        badgeClassName: "border-primary/30 text-primary/60",
        dotClassName: "bg-primary/60 animate-pulse",
    },
} as const;

function getStatus(isOffline: boolean, isPending: boolean): keyof typeof STATUS_STYLES {
    if (isOffline) return "offline";
    if (isPending) return "pending";
    return "online";
}

type NavItem = {
    href?: string;
    label: string;
    onClick?: () => void;
};

function NavLink({href, label, onClick, onNavigate}: NavItem & {onNavigate?: () => void}) {
    const cls = cn(
        "block w-full px-3 py-2 text-xs uppercase tracking-widest",
        "text-secondary-foreground hover:text-foreground",
        "border-l-2 border-transparent hover:border-primary",
        "transition-colors duration-100"
    );

    if (onClick) {
        return (
            <button type="button" className={cn(cls, "appearance-none text-left")} onClick={() => { onClick(); onNavigate?.(); }}>
                ► {label}
            </button>
        );
    }

    if (!href) {
        return <span className={cn(cls, "opacity-40")}>► {label}</span>;
    }

    return (
        <Link href={href} className={cls} onClick={onNavigate}>
            ► {label}
        </Link>
    );
}

function SidebarContents({onNavigate}: {onNavigate?: () => void}) {
    const [mounted, setMounted] = useState(false);
    const [name] = useLocalStorage("name", "Anonymous");
    const {data: session} = useSession();

    useEffect(() => { setMounted(true); }, []);

    const serversResponse = useQuery({...getAllServersOptions()});
    const servers = serversResponse.data ?? [];
    const serverCount = servers.length;
    const firstServer = servers[0];
    const isOffline = serversResponse.isError;
    const status = getStatus(isOffline, serversResponse.isPending);
    const statusLabel = {
        offline: "MASTER OFFLINE",
        pending: "CHECKING...",
        online: `${serverCount} SERVER${serverCount === 1 ? "" : "S"} LIVE`,
    }[status];
    const statusStyles = STATUS_STYLES[status];

    const normalizedName = name.trim();
    const profileHref = normalizedName.length > 0
        ? `/players/${encodeURIComponent(normalizedName)}`
        : undefined;

    const {websiteTitle, appVersion} = mounted
        ? getClientEnv()
        : {websiteTitle: "", appVersion: ""};

    const navItems: NavItem[] = [
        {href: "/scoreboard/distribution", label: "Activity"},
        {href: "/scoreboard", label: "Scoreboard"},
        {href: profileHref, label: "My Profile"},
        {href: "/storage", label: "Storage"},
        ...(session ? [
            ...(hasManagerAccess(session.user?.groups) ? [{href: "/serverfs", label: "Maps / Skins"}] : []),
            {
                label: `Logout (${session.user?.name ?? "user"})`,
                onClick: () => signOut({redirectTo: "/logout"}),
            },
        ] : []),
    ];

    return (
        <div className="flex flex-col h-full p-4 gap-4">
            {/* Title */}
            <Link href="/" onClick={onNavigate} className="block border-b border-primary/30 pb-4">
                <p className="text-3xl font-bold uppercase tracking-wide text-primary leading-tight font-sans">
                    {websiteTitle || " "}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    Q3JS-KOB{" "}
                    {mounted && !session ? (
                        <button
                            type="button"
                            className="hover:text-foreground transition-colors cursor-pointer"
                            onClick={(e) => { e.preventDefault(); signIn("authelia"); }}
                        >
                            v{appVersion}
                        </button>
                    ) : (
                        <span>v{appVersion}</span>
                    )}
                </p>
            </Link>

            {/* Play */}
            {firstServer ? (
                <JoinServerButton server={firstServer} ctaLabel="⛤ PLAY ⛤" className="w-full uppercase tracking-widest"/>
            ) : (
                <Button className="w-full uppercase tracking-widest" disabled>⛤ PLAY ⛤</Button>
            )}

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-2">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="secondary" className="w-full uppercase tracking-wider text-xs">
                            <BookOpen className="h-3 w-3"/>
                            Guide
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg p-8">
                        <DialogHeader>
                            <DialogTitle className="text-xl">Quick Guide</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 text-base py-4">
                            <p>
                                You can play on our server directly from this page, but we recommend you to use your
                                own pak0.pk3 from legally acquired Quake 3 Arena. We are not allowed to share it,
                                and the file you upload remains on your machine. pak0.pk3 from demo files is possible
                                to use but not recommended, as you will see missing textures here and there even on
                                3rd party maps we&apos;re mostly playing with. And would you ever want to play Q3A
                                without Bones anyway?
                            </p>
                            <p>Use <strong>F1</strong> instead of Esc to open game menu while staying in fullscreen mode.</p>
                            <p>Press <strong>F2</strong> to open an in-game server overlay (useful for admins).</p>
                            <p>Press <strong>H</strong> in-game to shout after killing (or being killed by) someone.</p>
                            <p>Press <strong>C</strong> to crouch.</p>
                            <p>Feel free to specify your own quake3 cfg in the custom field before joining the game.</p>
                            <p>
                                You can visit{" "}
                                <Link href="/storage" className="text-primary hover:underline"><strong>Storage</strong></Link>{" "}
                                page to manage your local client installation.
                            </p>
                            <p>
                                Still not convinced that it&apos;s a good idea to play from browser? Then join us
                                directly over UDP (port 27960) from your own CPMA client. But you&apos;ll miss our
                                cool custom skins like a huge black spider, or a pig-faced Marilyn Manson that makes
                                an unforgettable sound when drowning.
                            </p>
                            <p>Respectfully yours...</p>
                        </div>
                    </DialogContent>
                </Dialog>

                <Button variant="secondary" className="w-full uppercase tracking-wider text-xs" asChild>
                    <Link href="/scoreboard" onClick={onNavigate}>
                        <Trophy className="h-3 w-3"/>
                        Scores
                    </Link>
                </Button>
            </div>

            {/* Divider */}
            <div className="h-px bg-border"/>

            {/* Navigation */}
            <nav className="flex flex-col gap-0.5 flex-1">
                {navItems.map((item) => (
                    <NavLink key={item.label} {...item} onNavigate={onNavigate}/>
                ))}
            </nav>

            {/* Bottom */}
            <PwaInstallControl/>

            <Badge
                variant="outline"
                className={`h-7 justify-start gap-2 px-2 text-xs ${statusStyles.badgeClassName}`}
            >
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusStyles.dotClassName}`}/>
                {statusLabel}
            </Badge>
        </div>
    );
}

export function Sidebar() {
    const [sheetOpen, setSheetOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const {websiteTitle} = mounted ? getClientEnv() : {websiteTitle: ""};

    return (
        <>
            {/* Desktop sidebar */}
            <aside className="hidden md:flex flex-col w-72 h-screen sticky top-0 shrink-0 bg-sidebar border-r-2 border-primary/60 overflow-y-auto">
                <SidebarContents/>
            </aside>

            {/* Mobile top bar */}
            <div className="md:hidden fixed inset-x-0 top-0 z-50 h-14 flex items-center justify-between px-4 bg-sidebar border-b-2 border-primary/60">
                <Link href="/" className="font-bold uppercase tracking-wide text-primary text-lg font-sans">
                    {websiteTitle || " "}
                </Link>
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon-sm">
                            <MenuIcon className="size-4"/>
                            <span className="sr-only">Open menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80 p-0 bg-sidebar border-r-2 border-primary/60">
                        <SheetHeader className="border-b border-border px-4 py-3">
                            <SheetTitle className="text-primary uppercase tracking-wide font-sans">Menu</SheetTitle>
                        </SheetHeader>
                        <div className="overflow-y-auto h-[calc(100vh-56px)]">
                            <SidebarContents onNavigate={() => setSheetOpen(false)}/>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </>
    );
}
