import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/jsonDb';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (token) {
      const session = db.getSession(token);
      if (session) db.logAudit(session.user_id, 'LOGOUT', 'User logged out', ipAddress);
      db.invalidateSession(token);
      cookieStore.delete('session_token');
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
