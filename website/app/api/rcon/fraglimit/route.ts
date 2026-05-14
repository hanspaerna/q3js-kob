import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sendRconCommand, isRconConfigured } from '@/lib/rcon';

type FraglimitRequest = {
    host: string;
    port: number;
    fraglimit: number;
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
        const body: FraglimitRequest = await req.json();
        const { host, port, fraglimit } = body;

        if (!host || !port || typeof fraglimit !== 'number' || fraglimit < 0) {
            return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
        }

        const response = await sendRconCommand(host, port, `cv limit ${fraglimit}`);
        // there is a bug in CPMA which does not update the client's fraglimit/timelimit values set by server
        // so we are adding a spectator bot and kicking it instantly (kudos to myT!)
        await sendRconCommand(host, port, `addbot crash 1 s 0 0 q3srv-apply`);
        await sendRconCommand(host, port, `kick q3srv-apply`);
        return NextResponse.json({ success: true, response });
    } catch (error) {
        console.error('RCON fraglimit error:', error);
        return NextResponse.json({ error: 'Failed to send command' }, { status: 500 });
    }
}
