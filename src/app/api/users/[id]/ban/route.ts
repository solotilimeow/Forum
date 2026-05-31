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
    if (!actor || (actor.role !== 'admin' && actor.role !== 'moderator')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const targetId = Number(id);
    const target = db.findUserById(targetId);
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (target.role === 'admin') return NextResponse.json({ error: 'Cannot ban an admin' }, { status: 403 });
    if (actor.role === 'moderator' && target.role === 'moderator') {
      return NextResponse.json({ error: 'Moderators cannot ban other moderators' }, { status: 403 });
    }

    const { ban } = await request.json();

    if (ban) {
      db.banUser(targetId);
      db.logAudit(actor.id, 'BAN_USER', `Banned user: ${target.username}`, ip);
    } else {
      db.unbanUser(targetId);
      db.logAudit(actor.id, 'UNBAN_USER', `Unbanned user: ${target.username}`, ip);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ban user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
