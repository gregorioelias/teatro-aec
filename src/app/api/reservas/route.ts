import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

function genCodigo() {
  return 'RES-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function POST(req: Request) {
  const body = await req.json();
  const { funcion_id, butacas, nombre, email, estado = 'pendiente' } = body;

  if (!funcion_id || !butacas?.length) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  const placeholders = butacas.map(() => '?').join(',');
  const ocupadas = await db.execute({
    sql: `SELECT bo.butaca FROM butacas_ocupadas bo
          JOIN reservas r ON r.id = bo.reserva_id
          WHERE bo.funcion_id = ? AND bo.butaca IN (${placeholders})
            AND (r.estado = 'confirmada'
                 OR (r.estado = 'pendiente' AND r.creado_en > datetime('now', '-20 minutes')))`,
    args: [funcion_id, ...butacas],
  });

  if (ocupadas.rows.length > 0) {
    return NextResponse.json({
      error: 'Algunas butacas ya están ocupadas',
      butacas: ocupadas.rows.map(r => r.butaca),
    }, { status: 409 });
  }

  const funcion = await db.execute({
    sql: 'SELECT o.precio, o.titulo, f.fecha, f.hora FROM funciones f JOIN obras o ON o.id = f.obra_id WHERE f.id = ?',
    args: [funcion_id],
  });
  if (!funcion.rows.length) return NextResponse.json({ error: 'Función no encontrada' }, { status: 404 });

  const row = funcion.rows[0];
  const precio = row.precio as number;
  const total = precio * butacas.length;
  const codigo = genCodigo();

  const res = await db.execute({
    sql: 'INSERT INTO reservas (codigo, funcion_id, nombre, email, butacas, cantidad, total, estado) VALUES (?,?,?,?,?,?,?,?)',
    args: [codigo, funcion_id, nombre || null, email || null, butacas.join(','), butacas.length, total, estado],
  });
  const reservaId = Number(res.lastInsertRowid);

  for (const butaca of butacas) {
    await db.execute({
      sql: 'INSERT INTO butacas_ocupadas (funcion_id, butaca, reserva_id) VALUES (?,?,?)',
      args: [funcion_id, butaca, reservaId],
    });
  }

  return NextResponse.json({
    id: reservaId, codigo, total, butacas, cantidad: butacas.length,
    titulo: row.titulo, fecha: row.fecha, hora: row.hora, precio,
  });
}

export async function GET() {
  const res = await db.execute(`
    SELECT r.*, f.fecha, f.hora, o.titulo as obra
    FROM reservas r
    JOIN funciones f ON f.id = r.funcion_id
    JOIN obras o ON o.id = f.obra_id
    ORDER BY r.creado_en DESC
    LIMIT 100
  `);
  return NextResponse.json(res.rows);
}
