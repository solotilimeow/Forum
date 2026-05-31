import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/jsonDb';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const post = db.getPostById(Number(id));
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    return NextResponse.json({ post });
  } catch (error) {
    console.error('Get post error:', error);
    return NextResponse.json({ error: 'Failed to load post' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const postId = Number(id);
    const post = db.getPostById(postId);
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    db.deletePost(postId);
    db.logAudit(actor.id, 'DELETE_POST', `Deleted post "${post.title}" (ID: ${postId})`, request.headers.get('x-forwarded-for') || 'unknown');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete post error:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
