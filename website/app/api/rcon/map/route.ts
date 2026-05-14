import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sendRconCommand, isRconConfigured } from '@/lib/rcon';

type MapRequest = {
    host: string;
    port: number;
    map: string;
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
        const body: MapRequest = await req.json();
        const { host, port, map } = body;

        if (!host || !port || !map) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const response = await sendRconCommand(host, port, `map ${map}`);
        return NextResponse.json({ success: true, response });
    } catch (error) {
        console.error('RCON map error:', error);
        return NextResponse.json({ error: 'Failed to send command' }, { status: 500 });
    }
}
