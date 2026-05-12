import { BASEQ3_DIR } from '@/lib/constants';
import { auth } from '@/lib/auth';
import fs from 'fs';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { filename } = await req.json();

  // Safety check — prevent path traversal attacks
  if (filename.includes('/') || filename.includes('..')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  fs.unlinkSync(`${BASEQ3_DIR}/${filename}`);
  return NextResponse.json({ success: true });
}
