import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

function genCodigo() {
  return 'RES-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function POST(req: Request) {
  const body = await req.json();
  const { funcion_id, butacas, nombre, email } = body;

  if (!funcion_id || !butacas?.length) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  // verificar que las butacas estén disponibles
  const placeholders = butacas.map(() => '?').join(',');
  const ocupadas = await db.execute({
    sql: `SELECT butaca FROM butacas_ocupadas WHERE funcion_id = ? AND butaca IN (${placeholders})`,
    args: [funcion_id, ...butacas],
  });

  if (ocupadas.rows.length > 0) {
    return NextResponse.json({
      error: 'Algunas butacas ya están ocupadas',
      butacas: ocupadas.rows.map(r => r.butaca),
    }, { status: 409 });
  }

  // obtener precio de la función
  const funcion = await db.execute({
    sql: 'SELECT o.precio FROM funciones f JOIN obras o ON o.id = f.obra_id WHERE f.id = ?',
    args: [funcion_id],
  });
  if (!funcion.rows.length) return NextResponse.json({ error: 'Función no encontrada' }, { status: 404 });

  const precio = funcion.rows[0].precio as number;
  const total = precio * butacas.length;
  const codigo = genCodigo();

  // insertar reserva
  const res = await db.execute({
    sql: 'INSERT INTO reservas (codigo, funcion_id, nombre, email, butacas, cantidad, total) VALUES (?,?,?,?,?,?,?)',
    args: [codigo, funcion_id, nombre || null, email || null, butacas.join(','), butacas.length, total],
  });
  const reservaId = res.lastInsertRowid;

  // marcar butacas como ocupadas
  for (const butaca of butacas) {
    await db.execute({
      sql: 'INSERT INTO butacas_ocupadas (funcion_id, butaca, reserva_id) VALUES (?,?,?)',
      args: [funcion_id, butaca, reservaId],
    });
  }

  return NextResponse.json({ codigo, total, butacas, cantidad: butacas.length });
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
