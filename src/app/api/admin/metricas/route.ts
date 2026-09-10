import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { headers } from 'next/headers';

function checkAuth(h: Awaited<ReturnType<typeof headers>>) {
  const pass = h.get('x-admin-password');
  return pass === process.env.ADMIN_PASSWORD;
}

export async function GET() {
  const h = await headers();
  if (!checkAuth(h)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const [totales, porObra, porFuncion, ultimasReservas] = await Promise.all([
    db.execute(`
      SELECT
        COUNT(*) as total_reservas,
        SUM(cantidad) as total_entradas,
        SUM(total) as total_ingresos
      FROM reservas WHERE estado != 'cancelada'
    `),
    db.execute(`
      SELECT o.titulo, COUNT(r.id) as reservas, SUM(r.cantidad) as entradas, SUM(r.total) as ingresos
      FROM reservas r
      JOIN funciones f ON f.id = r.funcion_id
      JOIN obras o ON o.id = f.obra_id
      WHERE r.estado != 'cancelada'
      GROUP BY o.id
    `),
    db.execute(`
      SELECT f.fecha, f.hora, o.titulo, f.capacidad,
        COUNT(bo.id) as vendidas,
        ROUND(COUNT(bo.id) * 100.0 / f.capacidad, 1) as ocupacion
      FROM funciones f
      JOIN obras o ON o.id = f.obra_id
      LEFT JOIN butacas_ocupadas bo ON bo.funcion_id = f.id
      WHERE f.activa = 1
      GROUP BY f.id
      ORDER BY f.fecha
    `),
    db.execute(`
      SELECT r.codigo, r.creado_en, r.butacas, r.cantidad, r.total, r.nombre, o.titulo, f.fecha, f.hora
      FROM reservas r
      JOIN funciones f ON f.id = r.funcion_id
      JOIN obras o ON o.id = f.obra_id
      ORDER BY r.creado_en DESC
      LIMIT 20
    `),
  ]);

  return NextResponse.json({
    totales: totales.rows[0],
    porObra: porObra.rows,
    porFuncion: porFuncion.rows,
    ultimasReservas: ultimasReservas.rows,
  });
}
