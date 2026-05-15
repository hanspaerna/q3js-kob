import { NextResponse } from 'next/server';
import { authWithManagerGroup } from '@/lib/auth';
import { sendRconCommand, isRconConfigured } from '@/lib/rcon';

type InstagibRequest = {
    host: string;
    port: number;
    enabled: boolean;
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
        const body: InstagibRequest = await req.json();
        const { host, port, enabled } = body;

        if (!host || !port || typeof enabled !== 'boolean') {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const response = await sendRconCommand(host, port, `cv instagib ${enabled ? 1 : 0}`);
        return NextResponse.json({ success: true, response });
    } catch (error) {
        console.error('RCON instagib error:', error);
        return NextResponse.json({ error: 'Failed to send command' }, { status: 500 });
    }
}
