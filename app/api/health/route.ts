import { NextResponse } from 'next/server';
import { getPosts } from '@/lib/db';

export const dynamic = 'force-dynamic';

export function GET() {
  try {
    getPosts(); // vérifie que le volume de données est lisible et non corrompu
    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503 });
  }
}
