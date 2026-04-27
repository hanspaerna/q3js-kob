// app/api/cpma/route.ts — list files
import { CPMA_DIR } from '@/lib/constants';
import fs from 'fs';
import { NextResponse } from 'next/server';

const PASSWORD = process.env.ADMIN_PASSWORD;

export async function GET(req: Request) {
  if (req.headers.get('x-admin-password') !== PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!fs.existsSync(CPMA_DIR)) {
    return NextResponse.json({ error: `Directory not found: ${CPMA_DIR}` }, { status: 404 });
  }

  const files = fs.readdirSync(CPMA_DIR)
    .filter(f => f.endsWith('.pk3') && !f.startsWith('pak') && !f.startsWith('zzczhdwr'))
    .map(f => ({
      name: f,
      size: fs.statSync(`${CPMA_DIR}/${f}`).size
    }));

  return NextResponse.json({ files });
}