import { NextResponse } from 'next/server';
import { authWithManagerGroup } from '@/lib/auth';
import { sendRconCommand, isRconConfigured } from '@/lib/rcon';

type SayRequest = {
    host: string;
    port: number;
    message: string;
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
        const body: SayRequest = await req.json();
        const { host, port, message } = body;

        if (!host || !port || !message?.trim()) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const response = await sendRconCommand(host, port, `say ${message.trim()}`);
        return NextResponse.json({ success: true, response });
    } catch (error) {
        console.error('RCON say error:', error);
        return NextResponse.json({ error: 'Failed to send command' }, { status: 500 });
    }
}
