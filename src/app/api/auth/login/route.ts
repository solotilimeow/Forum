import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, sanitizeInput } from '@/lib/security';
import { db } from '@/lib/jsonDb';
import { cookies } from 'next/headers';

// login endpoint - handles both regular login and 2FA challenge

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const cleanUsername = sanitizeInput(username);

    // check if account is locked from too many failed attempts
    const attemptCheck = db.checkLoginAttempts(cleanUsername);
    if (!attemptCheck.allowed) {
      db.logAudit(null, 'LOGIN_BLOCKED', `Locked: ${cleanUsername}`, ipAddress);
      return NextResponse.json({ error: 'Account locked. Try again in 15 minutes.' }, { status: 429 });
    }

    const user = db.findUserByUsername(cleanUsername);
    if (!user) {
      db.recordLoginAttempt(cleanUsername, false);
      return NextResponse.json({ error: 'Invalid credentials', remaining: attemptCheck.remaining - 1 }, { status: 401 });
    }

    if (user.is_locked) {
      return NextResponse.json({ error: 'This account has been banned.' }, { status: 403 });
    }

    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      db.recordLoginAttempt(cleanUsername, false);
      const remaining = attemptCheck.remaining - 1;
      return NextResponse.json({ error: 'Invalid credentials', remaining }, { status: 401 });
    }

    db.recordLoginAttempt(cleanUsername, true);

    // if 2FA is enabled, don't create session yet - send to 2FA challenge
    // using a temp cookie to remember who they are
    if (user.totp_enabled) {
      const cookieStore = await cookies();
      cookieStore.set('pending_2fa', String(user.id), { httpOnly: true, sameSite: 'strict', path: '/', maxAge: 300 });
      return NextResponse.json({ requires_2fa: true });
    }

    // create session and set cookie
    const token = db.createSession(user.id, ipAddress);
    db.logAudit(user.id, 'LOGIN_SUCCESS', `User logged in`, ipAddress);

    const cookieStore = await cookies();
    cookieStore.set('session_token', token, { httpOnly: true, sameSite: 'strict', path: '/' });

    return NextResponse.json({ success: true, user: { id: user.id, username: user.username, role: user.role }, remaining: 3 });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
