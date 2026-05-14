import fs from 'fs';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { Readable } from 'stream';
import { BASEQ3_DIR } from '@/lib/constants';

// this API route is needed just to avoid restarting the website application every time the new model is added,
// as direct access to files from "public" would lead to 404
export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;

  if (file === 'pak0.pk3') {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  }

  const filePath = `${BASEQ3_DIR}/${file}`;

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const stream = fs.createReadStream(filePath);

  // Convert Node.js stream to Web ReadableStream
  const webStream = Readable.toWeb(stream) as ReadableStream;

  return new NextResponse(webStream, {
    headers: {
      'Content-Length': stat.size.toString(),
      'Content-Type': 'application/octet-stream',
    },
  });
}
