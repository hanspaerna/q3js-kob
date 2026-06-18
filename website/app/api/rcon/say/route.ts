import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sendRconCommand, isRconConfigured } from '@/lib/rcon';

const RCON_PASSWORD = process.env.RCON_PASSWORD;

const CYRILLIC_TO_LATIN: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
    'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh',
    'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O',
    'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts',
    'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu',
    'Я': 'Ya',
};

function transliterateCyrillic(text: string): string {
    return text.split('').map(char => CYRILLIC_TO_LATIN[char] ?? char).join('');
}

type SayRequest = {
    host: string;
    port: number;
    message: string;
};

export async function POST(req: Request) {
    const session = await auth();
    if (!session && req.headers.get("authorization") !== "Bearer " + RCON_PASSWORD) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isRconConfigured()) {
        return NextResponse.json({ error: 'RCON not configured' }, { status: 500 });
    }

    try {
        const body: SayRequest = await req.json();
        const { host, port, message } = body;

        if (!host || !port || !message?.trim()) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const transliteratedMessage = transliterateCyrillic(message.trim());
        const response = await sendRconCommand(host, port, `say ${transliteratedMessage}`);
        return NextResponse.json({ success: true, response });
    } catch (error) {
        console.error('RCON say error:', error);
        return NextResponse.json({ error: 'Failed to send command' }, { status: 500 });
    }
}
