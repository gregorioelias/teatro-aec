import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value;
  const isLogin = req.nextUrl.pathname === '/admin/login';

  if (isLogin) {
    if (token) {
      try {
        const secret = new TextEncoder().encode(process.env.ADMIN_PASSWORD || 'teatro-aec');
        await jwtVerify(token, secret);
        return NextResponse.redirect(new URL('/admin', req.url));
      } catch { /* token inválido, dejar pasar */ }
    }
    return NextResponse.next();
  }

  if (!token) return NextResponse.redirect(new URL('/admin/login', req.url));

  try {
    const secret = new TextEncoder().encode(process.env.ADMIN_PASSWORD || 'teatro-aec');
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }
}

export const config = { matcher: ['/admin', '/admin/:path*'] };
