import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, sanitizeInput, checkPasswordStrength } from '@/lib/security';
import { db } from '@/lib/jsonDb';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { username, email, password } = await request.json();
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

    const cleanUsername = sanitizeInput(username);
    const cleanEmail = sanitizeInput(email);

    const strength = checkPasswordStrength(password);
    if (strength.score < 2) {
      return NextResponse.json({ error: 'Password too weak', feedback: strength.feedback }, { status: 400 });
    }

    const exists = db.findUserByUsernameOrEmail(cleanUsername, cleanEmail);
    if (exists) {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = db.createUser(cleanUsername, cleanEmail, passwordHash);
    const token = db.createSession(user.id);
    db.logAudit(user.id, 'REGISTER', `New user registered: ${cleanUsername}`, ipAddress);

    const cookieStore = await cookies();
    cookieStore.set('session_token', token, { httpOnly: true, sameSite: 'strict', path: '/' });

    return NextResponse.json({ success: true, user: { id: user.id, username: user.username, role: user.role } }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
