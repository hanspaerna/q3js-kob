"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, X, Send } from "lucide-react";
import { Q3ColoredText } from "@/components/q3-colored-text";
import Link from "next/link";

interface ChatMessage {
    timestamp: string;
    text: string;
}

function parseMessage(text: string): { player: string; message: string } {
    const colonIndex = text.indexOf(": ");
    if (colonIndex === -1) {
        return { player: "", message: text };
    }
    return {
        player: text.slice(0, colonIndex),
        message: text.slice(colonIndex + 2),
    };
}

interface ChatOverlayProps {
    serverHost: string;
    serverPort: number;
    onClose: () => void;
}

function ChatOverlay({ serverHost, serverPort, onClose }: ChatOverlayProps) {
    const { data: session } = useSession();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [connected, setConnected] = useState(false);
    const [chatInput, setChatInput] = useState("");
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const isAuthenticated = !!session?.user;

    const sendMessage = async () => {
        if (!chatInput.trim() || sending) return;

        setSending(true);
        try {
            const res = await fetch("/api/rcon/say", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    host: serverHost,
                    port: serverPort,
                    message: chatInput.trim(),
                }),
            });
            if (res.ok) {
                setChatInput("");
            }
        } catch (err) {
            console.error("Failed to send message:", err);
        } finally {
            setSending(false);
        }
    };

    useEffect(() => {
        const abortController = new AbortController();

        async function fetchHistory() {
            try {
                const response = await fetch(`https://${serverHost}/chat`, {
                    signal: abortController.signal,
                });
                if (!response.ok) {
                    throw new Error(`Failed to fetch chat history: ${response.status}`);
                }
                const data = await response.json();
                const history: ChatMessage[] = Array.isArray(data) ? data : [];
                setMessages(history);
            } catch (err) {
                if (err instanceof Error && err.name !== "AbortError") {
                    setError(err.message);
                }
            }
        }

        fetchHistory();

        // Connect to WebSocket
        const ws = new WebSocket(`wss://${serverHost}/chat`);
        wsRef.current = ws;

        ws.onopen = () => {
            setConnected(true);
            setError(null);
        };

        ws.onmessage = (event) => {
            try {
                const message: ChatMessage = JSON.parse(event.data);
                setMessages((prev) => [...prev, message]);
            } catch {
                // Ignore invalid messages
            }
        };

        ws.onerror = () => {
            // Only show error if we never connected
            if (ws.readyState !== WebSocket.OPEN) {
                setError("WebSocket connection error");
            }
        };

        ws.onclose = () => {
            setConnected(false);
        };

        return () => {
            abortController.abort();
            ws.close();
        };
    }, [serverHost]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="relative mx-4 flex h-[80vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-background shadow-lg">
                <div className="flex items-center justify-between border-b border-border p-4">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        <h2 className="text-lg font-semibold">Server Chat</h2>
                        {connected && (
                            <span className="ml-2 h-2 w-2 rounded-full bg-green-500" title="Connected" />
                        )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {error && (
                        <p className="mb-4 text-sm text-destructive">{error}</p>
                    )}
                    {messages.length === 0 && !error && (
                        <p className="text-sm text-muted-foreground">No messages yet.</p>
                    )}
                    <div className="space-y-2 text-sm">
                        {messages.map((msg, index) => {
                            const { player, message } = parseMessage(msg.text);
                            return (
                                <div key={index} className="break-words">
                                    <span className="text-muted-foreground">
                                        {new Date(msg.timestamp).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, ".")}{" "}
                                        {new Date(msg.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}
                                    </span>{" "}
                                    <span className="font-semibold">
                                        {player ? (
                                            <Link
                                                href={`/players/${encodeURIComponent(player)}`}
                                                className="hover:underline"
                                            >
                                                <Q3ColoredText text={player} />
                                            </Link>
                                        ) : (
                                            <Q3ColoredText text="Console" />
                                        )}
                                    </span>
                                    <span className="text-muted-foreground">: </span>
                                    <span style={{ whiteSpace: 'pre-line' }}>{message.includes('\n') ? <pre style={{ fontSize: "0.8em" }}>{message}</pre> : message}</span>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {isAuthenticated && (
                    <div className="border-t border-border p-4">
                        <form
                            className="flex gap-2"
                            onSubmit={(e) => {
                                e.preventDefault();
                                sendMessage();
                            }}
                        >
                            <Input
                                type="text"
                                placeholder="Type a message..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                disabled={sending}
                                className="flex-1"
                            />
                            <Button type="submit" disabled={sending || !chatInput.trim()}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}

interface ChatButtonProps {
    serverHost: string;
    serverPort: number;
}

export function ChatButton({ serverHost, serverPort }: ChatButtonProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button variant="outline" size="lg" onClick={() => setIsOpen(true)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat
            </Button>
            {isOpen && (
                <ChatOverlay
                    serverHost={serverHost}
                    serverPort={serverPort}
                    onClose={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
