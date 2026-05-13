import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sendRconCommand, isRconConfigured } from '@/lib/rcon';

const ALLOWED_GAMEPLAYS = [0, 1, 2, 3] as const;
type Gameplay = typeof ALLOWED_GAMEPLAYS[number];

type GameplayRequest = {
    host: string;
    port: number;
    gameplay: Gameplay;
};

export async function POST(req: Request) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isRconConfigured()) {
        return NextResponse.json({ error: 'RCON not configured' }, { status: 500 });
    }

    try {
        const body: GameplayRequest = await req.json();
        const { host, port, gameplay } = body;

        if (!host || !port || !ALLOWED_GAMEPLAYS.includes(gameplay)) {
            return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
        }

        const response = await sendRconCommand(host, port, `cv gameplay ${gameplay}`);
        return NextResponse.json({ success: true, response });
    } catch (error) {
        console.error('RCON gameplay error:', error);
        return NextResponse.json({ error: 'Failed to send command' }, { status: 500 });
    }
}
