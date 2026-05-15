import { NextResponse } from 'next/server';
import { authWithManagerGroup } from '@/lib/auth';
import { sendRconCommand, isRconConfigured } from '@/lib/rcon';

type KickRequest = {
    host: string;
    port: number;
    clientId: number;
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
        const body: KickRequest = await req.json();
        const { host, port, clientId } = body;

        if (!host || !port || typeof clientId !== 'number') {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const response = await sendRconCommand(host, port, `clientkick ${clientId}`);
        return NextResponse.json({ success: true, response });
    } catch (error) {
        console.error('RCON kick error:', error);
        return NextResponse.json({ error: 'Failed to send command' }, { status: 500 });
    }
}
