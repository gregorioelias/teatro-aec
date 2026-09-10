import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

export async function POST(req: Request) {
  const body = await req.json();
  const { reserva_id, codigo, titulo, fecha, hora, butacas, cantidad, precio, total, nombre, email } = body;

  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  const pref = await new Preference(mp).create({
    body: {
      external_reference: String(reserva_id),
      items: [{
        id: codigo,
        title: `${titulo} — ${fecha} ${hora}`,
        description: `${cantidad} butaca${cantidad !== 1 ? 's' : ''}: ${butacas.join(', ')}`,
        quantity: cantidad,
        unit_price: precio,
        currency_id: 'ARS',
      }],
      payer: {
        name: nombre || undefined,
        email: email || undefined,
      },
      back_urls: {
        success: `${appUrl}/pago?estado=aprobado&reserva=${codigo}`,
        failure: `${appUrl}/pago?estado=rechazado&reserva=${codigo}`,
        pending: `${appUrl}/pago?estado=pendiente&reserva=${codigo}`,
      },
      auto_return: 'approved',
      notification_url: `${appUrl}/api/pago/webhook`,
      metadata: { reserva_id, codigo, total },
    },
  });

  return NextResponse.json({ init_point: pref.init_point, id: pref.id });
}
