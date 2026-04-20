import fs from 'fs';
import { NextResponse } from 'next/server';

// this API route is needed just to avoid restarting the website application every time the new model is added,
// as direct access to files from "public" would lead to 404
export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const filePath = `/app/public/baseq3/${file}`;

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  return new NextResponse(fileBuffer);
}