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
    const actor = db.findUserById(session.user_id);
    if (!actor || actor.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const users = db.getAllUsers().map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      is_locked: u.is_locked,
      created_at: u.created_at,
    }));
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
