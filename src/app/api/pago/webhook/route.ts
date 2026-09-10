import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { db } from '@/lib/db';
import { sendTicketEmail } from '@/lib/email';

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

export async function POST(req: Request) {
  const body = await req.json();

  if (body.type !== 'payment') return NextResponse.json({ ok: true });

  const paymentId = body.data?.id;
  if (!paymentId) return NextResponse.json({ ok: true });

  const payment = await new Payment(mp).get({ id: paymentId });
  const reservaId = payment.external_reference;
  const status = payment.status;

  if (!reservaId) return NextResponse.json({ ok: true });

  const estado = status === 'approved' ? 'confirmada' : status === 'rejected' ? 'cancelada' : 'pendiente';

  await db.execute({
    sql: 'UPDATE reservas SET estado = ? WHERE id = ?',
    args: [estado, reservaId],
  });

  if (estado === 'cancelada') {
    await db.execute({
      sql: 'DELETE FROM butacas_ocupadas WHERE reserva_id = ?',
      args: [reservaId],
    });
  }

  // enviar entrada por mail cuando el pago se aprueba
  if (estado === 'confirmada') {
    const res = await db.execute({
      sql: `SELECT r.nombre, r.email, r.butacas, r.codigo, r.total,
                   o.titulo, f.fecha, f.hora
            FROM reservas r
            JOIN funciones f ON f.id = r.funcion_id
            JOIN obras o ON o.id = f.obra_id
            WHERE r.id = ?`,
      args: [reservaId],
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
        console.error('Error enviando email de entrada:', e);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
