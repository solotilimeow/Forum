import { NextRequest, NextResponse } from 'next/server';
import { sanitizeInput } from '@/lib/security';
import { db } from '@/lib/jsonDb';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    return NextResponse.json({ posts: db.getPosts() });
  } catch (error) {
    console.error('Get posts error:', error);
    return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = db.getSession(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    db.checkSessionIp(token, ipAddress);
    const dbUser = db.findUserById(session.user_id);
    if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, content, image_url } = await request.json();
    const cleanTitle = sanitizeInput(title);
    const cleanContent = sanitizeInput(content);

    const post = db.createPost(dbUser.id, cleanTitle, cleanContent, image_url);
    db.logAudit(dbUser.id, 'CREATE_POST', `Created post "${cleanTitle}"`, ipAddress);
    return NextResponse.json({ success: true, post }, { status: 201 });

  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
