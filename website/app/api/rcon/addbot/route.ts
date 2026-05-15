import { NextResponse } from 'next/server';
import { authWithManagerGroup } from '@/lib/auth';
import { sendRconCommand, isRconConfigured } from '@/lib/rcon';

type AddBotRequest = {
    host: string;
    port: number;
    model: string;
    level: number;
    team?: 'red' | 'blue';
};

export async function POST(req: Request) {
    const session = await authWithManagerGroup();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isRconConfigured()) {
        return NextResponse.json({ error: 'RCON not configured' }, { status: 500 });
    }

    try {
        const body: AddBotRequest = await req.json();
        const { host, port, model, level, team } = body;

        if (!host || !port || !model || typeof level !== 'number' || level < 1 || level > 5) {
            return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
        }

        const command = team ? `addbot ${model} ${level} ${team}` : `addbot ${model} ${level}`;
        const response = await sendRconCommand(host, port, command);
        return NextResponse.json({ success: true, response });
    } catch (error) {
        console.error('RCON addbot error:', error);
        return NextResponse.json({ error: 'Failed to send command' }, { status: 500 });
    }
}
