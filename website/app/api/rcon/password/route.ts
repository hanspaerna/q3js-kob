import { NextResponse } from 'next/server';
import { authWithManagerGroup } from '@/lib/auth';
import { isRconConfigured } from '@/lib/rcon';

export async function GET() {
    const session = await authWithManagerGroup();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isRconConfigured()) {
        return NextResponse.json({ error: 'RCON not configured' }, { status: 500 });
    }

    return NextResponse.json({ password: process.env.RCON_PASSWORD });
}
