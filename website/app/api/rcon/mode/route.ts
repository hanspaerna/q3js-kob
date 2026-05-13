import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sendRconCommand, isRconConfigured } from '@/lib/rcon';

const ALLOWED_MODES = ['KOB_CPMDM', 'KOB_CPMTDM', 'KOB_CPMCTF'] as const;
type AllowedMode = typeof ALLOWED_MODES[number];

type ModeRequest = {
    host: string;
    port: number;
    mode: AllowedMode;
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
        const body: ModeRequest = await req.json();
        const { host, port, mode } = body;

        if (!host || !port || !mode) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!ALLOWED_MODES.includes(mode)) {
            return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
        }

        const response = await sendRconCommand(host, port, `cv mode ${mode}`);
        return NextResponse.json({ success: true, response });
    } catch (error) {
        console.error('RCON mode error:', error);
        return NextResponse.json({ error: 'Failed to send command' }, { status: 500 });
    }
}
