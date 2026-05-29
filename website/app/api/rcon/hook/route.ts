import { NextResponse } from 'next/server';
import { authWithManagerGroup } from '@/lib/auth';
import { sendRconCommand, isRconConfigured } from '@/lib/rcon';

type HookRequest = {
    host: string;
    port: number;
    value: number;
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
        const body: HookRequest = await req.json();
        const { host, port, value } = body;

        if (!host || !port || typeof value !== 'number') {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const response = await sendRconCommand(host, port, `cv hook ${value}`);
        return NextResponse.json({ success: true, response });
    } catch (error) {
        console.error('RCON hook error:', error);
        return NextResponse.json({ error: 'Failed to send command' }, { status: 500 });
    }
}
