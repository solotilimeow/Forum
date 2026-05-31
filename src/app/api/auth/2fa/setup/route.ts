import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/jsonDb';
import { cookies } from 'next/headers';
import { generateSecret, generateURI } from 'otplib';
import QRCode from 'qrcode';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = db.getSession(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = db.findUserById(session.user_id);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.totp_enabled) {
      return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 });
    }

    const secret = generateSecret();
    db.setTotpSecret(user.id, secret);

    const otpauth = generateURI({ issuer: 'Forum App', label: `${user.username}@Forum App`, secret });
    const qrDataUrl = await QRCode.toDataURL(otpauth);

    return NextResponse.json({ secret, qrDataUrl });
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
