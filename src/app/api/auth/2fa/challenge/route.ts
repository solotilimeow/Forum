import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/jsonDb';
import { cookies } from 'next/headers';
import { verify } from 'otplib';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const pending = cookieStore.get('pending_2fa')?.value;
    if (!pending) return NextResponse.json({ error: 'No pending 2FA challenge' }, { status: 400 });

    let userId: number;
    try {
      userId = parseInt(pending, 10);
      if (isNaN(userId)) throw new Error();
    } catch {
      return NextResponse.json({ error: 'Invalid challenge' }, { status: 400 });
    }

    const user = db.findUserById(userId);
    if (!user || !user.totp_enabled || !user.totp_secret) {
      return NextResponse.json({ error: 'Invalid challenge' }, { status: 400 });
    }

    const { code } = await request.json();
    const result = await verify({ token: code, secret: user.totp_secret });
    if (!result || (result as any).valid === false) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 401 });
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const sessionToken = db.createSession(user.id, ipAddress);
    db.logAudit(user.id, 'LOGIN_SUCCESS', 'User logged in (2FA)', ipAddress);

    cookieStore.delete('pending_2fa');
    cookieStore.set('session_token', sessionToken, { httpOnly: true, sameSite: 'strict', path: '/' });

    return NextResponse.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    console.error('2FA challenge error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
