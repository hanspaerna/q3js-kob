import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sendRconCommand, isRconConfigured } from '@/lib/rcon';

type TimelimitRequest = {
    host: string;
    port: number;
    timelimit: number;
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
        const body: TimelimitRequest = await req.json();
        const { host, port, timelimit } = body;

        if (!host || !port || typeof timelimit !== 'number' || timelimit < 0) {
            return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
        }

        const response = await sendRconCommand(host, port, `cv timelimit ${timelimit}`);
        // there is a bug in CPMA which does not update the client's fraglimit/timelimit values set by server
        // so we are adding a spectator bot and kicking it instantly (kudos to myT!)
        await sendRconCommand(host, port, `addbot crash 1 s 0 0 q3srv-apply`);
        await sendRconCommand(host, port, `kick q3srv-apply`);
        return NextResponse.json({ success: true, response });
    } catch (error) {
        console.error('RCON timelimit error:', error);
        return NextResponse.json({ error: 'Failed to send command' }, { status: 500 });
    }
}
