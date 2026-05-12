// app/api/baseq3/route.ts — list files
import { BASEQ3_DIR } from '@/lib/constants';
import { auth } from '@/lib/auth';
import fs from 'fs';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!fs.existsSync(BASEQ3_DIR)) {
    return NextResponse.json({ error: `Directory not found: ${BASEQ3_DIR}` }, { status: 404 });
  }

  const files = fs.readdirSync(BASEQ3_DIR)
    .filter(f => f.endsWith('.pk3') && !f.startsWith('pak') && !f.startsWith('zzczhdwr'))
    .map(f => ({
      name: f,
      size: fs.statSync(`${BASEQ3_DIR}/${f}`).size
    }));

  return NextResponse.json({ files });
}
