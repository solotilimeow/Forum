import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/jsonDb';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = db.getSession(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    db.checkSessionIp(token, ip);
    const user = db.findUserById(session.user_id);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'moderator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ logs: db.getAuditLog() });
  } catch (error) {
    console.error('Audit log error:', error);
    return NextResponse.json({ error: 'Failed to load audit logs' }, { status: 500 });
  }
}
