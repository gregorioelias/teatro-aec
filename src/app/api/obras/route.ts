import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const obras = await db.execute(`
    SELECT o.*,
      json_group_array(
        json_object('id', f.id, 'fecha', f.fecha, 'hora', f.hora, 'capacidad', f.capacidad)
      ) as funciones
    FROM obras o
    LEFT JOIN funciones f ON f.obra_id = o.id AND f.activa = 1
    WHERE o.activa = 1
    GROUP BY o.id
    ORDER BY o.id
  `);

  const data = obras.rows.map(r => ({
    ...r,
    funciones: JSON.parse(r.funciones as string).filter((f: { id: number }) => f.id !== null),
  }));

  return NextResponse.json(data);
}
