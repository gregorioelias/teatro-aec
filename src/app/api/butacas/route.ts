import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const funcionId = searchParams.get('funcion_id');
  if (!funcionId) return NextResponse.json({ error: 'funcion_id requerido' }, { status: 400 });

  const res = await db.execute({
    sql: 'SELECT butaca FROM butacas_ocupadas WHERE funcion_id = ?',
    args: [funcionId],
  });

  return NextResponse.json(res.rows.map(r => r.butaca));
}
