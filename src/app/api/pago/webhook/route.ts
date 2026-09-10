import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { db } from '@/lib/db';

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

  // si se cancela, liberar las butacas
  if (estado === 'cancelada') {
    await db.execute({
      sql: 'DELETE FROM butacas_ocupadas WHERE reserva_id = ?',
      args: [reservaId],
    });
  }

  return NextResponse.json({ ok: true });
}
