import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';
import { cookies } from 'next/headers';

async function checkAuth() {
  const jar = await cookies();
  const token = jar.get('admin_token')?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}

export async function GET() {
  if (!(await checkAuth())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const [totales, porObra, porFuncion, ultimasReservas, porDia] = await Promise.all([
    db.execute(`
      SELECT
        COUNT(*) as total_reservas,
        COALESCE(SUM(cantidad), 0) as total_entradas,
        COALESCE(SUM(total), 0) as total_ingresos
      FROM reservas WHERE estado = 'confirmada'
    `),
    db.execute(`
      SELECT o.id, o.titulo, o.precio,
        COUNT(DISTINCT f.id) as funciones,
        COALESCE(SUM(r.cantidad), 0) as entradas,
        COALESCE(SUM(r.total), 0) as ingresos,
        ROUND(COALESCE(SUM(r.cantidad), 0) * 100.0 / (COUNT(DISTINCT f.id) * 450), 1) as ocupacion
      FROM obras o
      LEFT JOIN funciones f ON f.obra_id = o.id AND f.activa = 1
      LEFT JOIN reservas r ON r.funcion_id = f.id AND r.estado = 'confirmada'
      WHERE o.activa = 1
      GROUP BY o.id
      ORDER BY ingresos DESC
    `),
    db.execute(`
      SELECT f.id, f.fecha, f.hora, f.capacidad, o.titulo,
        COALESCE(COUNT(CASE WHEN r.estado = 'confirmada' THEN r.id END), 0) as vendidas,
        COALESCE(SUM(CASE WHEN r.estado = 'confirmada' THEN r.total ELSE 0 END), 0) as ingresos,
        ROUND(COALESCE(COUNT(CASE WHEN r.estado = 'confirmada' THEN r.id END), 0) * 100.0 / f.capacidad, 1) as ocupacion
      FROM funciones f
      JOIN obras o ON o.id = f.obra_id
      LEFT JOIN reservas r ON r.funcion_id = f.id
      WHERE f.activa = 1 AND o.activa = 1
      GROUP BY f.id
      ORDER BY f.fecha ASC
    `),
    db.execute(`
      SELECT r.id, r.codigo, r.creado_en, r.butacas, r.cantidad, r.total, r.nombre, r.email, r.estado, o.titulo, f.fecha, f.hora
      FROM reservas r
      JOIN funciones f ON f.id = r.funcion_id
      JOIN obras o ON o.id = f.obra_id
      ORDER BY r.creado_en DESC
      LIMIT 30
    `),
    db.execute(`
      SELECT DATE(creado_en) as dia,
        COUNT(*) as reservas,
        SUM(cantidad) as entradas,
        SUM(total) as ingresos
      FROM reservas
      WHERE estado = 'confirmada'
        AND creado_en >= datetime('now', '-30 days')
      GROUP BY DATE(creado_en)
      ORDER BY dia ASC
    `),
  ]);

  return NextResponse.json({
    totales: totales.rows[0],
    porObra: porObra.rows,
    porFuncion: porFuncion.rows,
    ultimasReservas: ultimasReservas.rows,
    porDia: porDia.rows,
  });
}
