import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/jsonDb';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const { id } = await params;
    const targetId = Number(id);
    const target = db.findUserById(targetId);
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (target.id === actor.id) return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });

    const { role } = await request.json();
    if (!['user', 'moderator'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    db.setUserRole(targetId, role);
    db.logAudit(actor.id, 'SET_ROLE', `Set ${target.username} role to ${role}`, ip);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
