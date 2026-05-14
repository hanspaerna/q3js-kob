import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sendRconCommand, isRconConfigured } from '@/lib/rcon';

type KickRequest = {
    host: string;
    port: number;
    name: string;
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
        const body: KickRequest = await req.json();
        const { host, port, name } = body;

        if (!host || !port || !name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const response = await sendRconCommand(host, port, `kick ${name}`);
        return NextResponse.json({ success: true, response });
    } catch (error) {
        console.error('RCON kick error:', error);
        return NextResponse.json({ error: 'Failed to send command' }, { status: 500 });
    }
}
