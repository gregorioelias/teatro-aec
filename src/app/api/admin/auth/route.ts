import { NextResponse } from 'next/server';
import { signAdminToken } from '@/lib/auth';

export async function POST(req: Request) {
  const { password } = await req.json();
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }
  const token = await signAdminToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 horas
    path: '/',
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('admin_token');
  return res;
}
