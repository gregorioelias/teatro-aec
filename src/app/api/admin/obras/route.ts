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

export async function POST(req: Request) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();
  const { titulo, genero, descripcion, duracion, precio, funciones } = body;

  if (!titulo || !precio || !funciones?.length) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  try {
    const obraRes = await db.execute({
      sql: 'INSERT INTO obras (titulo, genero, descripcion, duracion, precio) VALUES (?,?,?,?,?)',
      args: [titulo, genero || '', descripcion || '', duracion || '', precio],
    });
    const obraId = obraRes.lastInsertRowid;

    for (const f of funciones) {
      await db.execute({
        sql: 'INSERT INTO funciones (obra_id, fecha, hora, capacidad) VALUES (?,?,?,?)',
        args: [obraId, f.fecha, f.hora, f.capacidad || 450],
      });
    }

    return NextResponse.json({ id: obraId });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  await db.execute({ sql: 'UPDATE obras SET activa = 0 WHERE id = ?', args: [id] });
  return NextResponse.json({ ok: true });
}
