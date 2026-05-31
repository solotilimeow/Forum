import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/jsonDb';
import { cookies } from 'next/headers';
import { verify } from 'otplib';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = db.getSession(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = db.findUserById(session.user_id);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!user.totp_enabled) {
      return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 });
    }

    const { code } = await request.json();
    const result = await verify({ token: code, secret: user.totp_secret! });
    if (!result || (result as any).valid === false) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    db.disableTotp(user.id);
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    db.logAudit(user.id, '2FA_DISABLED', '2FA disabled by user', ip);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
