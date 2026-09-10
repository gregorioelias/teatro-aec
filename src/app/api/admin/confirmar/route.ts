import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { sendTicketEmail } from '@/lib/email';

async function checkAuth() {
  const jar = await cookies();
  const token = jar.get('admin_token')?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}

export async function POST(req: Request) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { reserva_id } = await req.json();
  if (!reserva_id) return NextResponse.json({ error: 'reserva_id requerido' }, { status: 400 });

  await db.execute({ sql: "UPDATE reservas SET estado = 'confirmada' WHERE id = ?", args: [reserva_id] });

  // enviar email si tiene dirección
  const res = await db.execute({
    sql: `SELECT r.nombre, r.email, r.butacas, r.codigo, r.total,
                 o.titulo, f.fecha, f.hora
          FROM reservas r
          JOIN funciones f ON f.id = r.funcion_id
          JOIN obras o ON o.id = f.obra_id
          WHERE r.id = ?`,
    args: [reserva_id],
  });
  const row = res.rows[0];
  if (row?.email) {
    try {
      await sendTicketEmail({
        nombre: row.nombre as string | null,
        email: row.email as string,
        titulo: row.titulo as string,
        fecha: row.fecha as string,
        hora: row.hora as string,
        butacas: (row.butacas as string).split(','),
        codigo: row.codigo as string,
        total: row.total as number,
      });
    } catch (e) {
      console.error('Error enviando email:', e);
    }
  }

  return NextResponse.json({ ok: true });
}
