import { NextResponse } from 'next/server';
import { authWithManagerGroup } from '@/lib/auth';
import { sendRconCommand, isRconConfigured } from '@/lib/rcon';

const ALLOWED_OVERTIMES = [0, 1, 2] as const;

type OvertimeRequest = {
    host: string;
    port: number;
    overtime: number;
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
        const body: OvertimeRequest = await req.json();
        const { host, port, overtime } = body;

        if (!host || !port || !ALLOWED_OVERTIMES.includes(overtime as typeof ALLOWED_OVERTIMES[number])) {
            return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
        }

        const response = await sendRconCommand(host, port, `cv overtime ${overtime}`);
        return NextResponse.json({ success: true, response });
    } catch (error) {
        console.error('RCON overtime error:', error);
        return NextResponse.json({ error: 'Failed to send command' }, { status: 500 });
    }
}
