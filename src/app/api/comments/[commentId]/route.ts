import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/jsonDb';
import { cookies } from 'next/headers';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = db.getSession(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    db.checkSessionIp(token, ip);
    const actor = db.findUserById(session.user_id);
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (actor.role !== 'admin' && actor.role !== 'moderator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { commentId } = await params;
    db.deleteComment(Number(commentId));
    db.logAudit(actor.id, 'DELETE_COMMENT', `Deleted comment ID: ${commentId}`, ip);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete comment error:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
