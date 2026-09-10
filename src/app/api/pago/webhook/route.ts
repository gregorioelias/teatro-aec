import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { db } from '@/lib/db';
import { sendTicketEmail } from '@/lib/email';
import crypto from 'crypto';

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

function verifySignature(req: Request, rawBody: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // si no hay secret configurado, dejamos pasar

  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id');
  if (!xSignature) return false;

  const url = new URL(req.url);
  const dataId = url.searchParams.get('data.id') ?? '';

  // MP firma: ts=...;v1=...
  const parts = Object.fromEntries(xSignature.split(';').map(p => p.split('=')));
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId ?? ''};ts:${ts};`;
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return expected === v1;
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  if (!verifySignature(req, rawBody)) {
    return NextResponse.json({ error: 'firma inválida' }, { status: 401 });
  }
  const body = JSON.parse(rawBody);

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
