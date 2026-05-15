import { NextResponse } from 'next/server';
import { authWithManagerGroup } from '@/lib/auth';
import { sendRconCommand, isRconConfigured } from '@/lib/rcon';

type RestartRequest = {
    host: string;
    port: number;
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
        const body: RestartRequest = await req.json();
        const { host, port } = body;

        if (!host || !port) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const response = await sendRconCommand(host, port, 'map_restart 0');
        return NextResponse.json({ success: true, response });
    } catch (error) {
        console.error('RCON restart error:', error);
        return NextResponse.json({ error: 'Failed to send command' }, { status: 500 });
    }
}
