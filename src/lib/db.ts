import { createClient } from '@libsql/client';

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export async function initDB() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS obras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      genero TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      duracion TEXT NOT NULL,
      precio INTEGER NOT NULL,
      ocupacion_base REAL NOT NULL DEFAULT 0.3,
      activa INTEGER NOT NULL DEFAULT 1,
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS funciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      obra_id INTEGER NOT NULL REFERENCES obras(id),
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      capacidad INTEGER NOT NULL DEFAULT 450,
      activa INTEGER NOT NULL DEFAULT 1,
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reservas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL UNIQUE,
      funcion_id INTEGER NOT NULL REFERENCES funciones(id),
      nombre TEXT,
      email TEXT,
      butacas TEXT NOT NULL,
      cantidad INTEGER NOT NULL,
      total INTEGER NOT NULL,
      estado TEXT NOT NULL DEFAULT 'confirmada',
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS butacas_ocupadas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      funcion_id INTEGER NOT NULL REFERENCES funciones(id),
      butaca TEXT NOT NULL,
      reserva_id INTEGER REFERENCES reservas(id),
      UNIQUE(funcion_id, butaca)
    );
  `);
}
