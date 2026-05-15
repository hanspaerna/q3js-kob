import { ADMIN_UPLOAD_LIMIT_MB, BASEQ3_DIR } from '@/lib/constants';
import { authWithManagerGroup } from '@/lib/auth';
import fs from 'fs';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = await authWithManagerGroup();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (file.size > ADMIN_UPLOAD_LIMIT_MB * 1024 * 1024) {
    return NextResponse.json({ error: `File exceeds ${ADMIN_UPLOAD_LIMIT_MB} MB limit` }, { status: 413 });
  }

  if (!file.name.endsWith('.pk3')) {
    return NextResponse.json({ error: 'Only .pk3 files are allowed' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(`${BASEQ3_DIR}/${file.name}`, buffer);

  return NextResponse.json({ success: true });
}
