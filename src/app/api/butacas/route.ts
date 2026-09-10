import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const funcionId = searchParams.get('funcion_id');
  if (!funcionId) return NextResponse.json({ error: 'funcion_id requerido' }, { status: 400 });

  // Solo contar butacas de reservas confirmadas, o pendientes de los últimos 20 min
  const res = await db.execute({
    sql: `SELECT bo.butaca FROM butacas_ocupadas bo
          JOIN reservas r ON r.id = bo.reserva_id
          WHERE bo.funcion_id = ?
            AND (r.estado = 'confirmada'
                 OR (r.estado = 'pendiente' AND r.creado_en > datetime('now', '-20 minutes')))`,
    args: [funcionId],
  });

  return NextResponse.json(res.rows.map(r => r.butaca));
}
