import { NextRequest, NextResponse } from 'next/server';
import { sanitizeInput } from '@/lib/security';
import { db } from '@/lib/jsonDb';
import { cookies } from 'next/headers';

async function getActor() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  if (!token) return null;
  const session = db.getSession(token);
  if (!session) return null;
  return db.findUserById(session.user_id) || null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return NextResponse.json({ comments: db.getCommentsByPostId(Number(id)) });
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const postId = Number(id);

    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = db.getSession(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    db.checkSessionIp(token, ipAddress);
    const dbUser = db.findUserById(session.user_id);
    if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { content, parent_id } = await request.json();
    const cleanContent = sanitizeInput(content);

    const comment = db.createComment(postId, dbUser.id, cleanContent, parent_id || null);
    db.logAudit(dbUser.id, 'CREATE_COMMENT', `Commented on post ${postId}`, ipAddress);
    return NextResponse.json({ success: true, comment }, { status: 201 });

  } catch (error) {
    console.error('Create comment error:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
