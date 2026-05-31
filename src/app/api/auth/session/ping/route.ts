import { NextResponse } from 'next/server';
import { db } from '@/lib/jsonDb';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  if (!token) return NextResponse.json({ error: 'No active session' }, { status: 401 });
  const session = db.getSession(token);
  if (!session) return NextResponse.json({ error: 'No active session' }, { status: 401 });
  db.updateSessionActivity(token);
  return NextResponse.json({ success: true });
}
