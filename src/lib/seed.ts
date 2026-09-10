import { db, initDB } from './db';

export async function seed() {
  await initDB();

  const obras = await db.execute('SELECT COUNT(*) as count FROM obras');
  if ((obras.rows[0].count as number) > 0) return;

  await db.executeMultiple(`
    INSERT INTO obras (titulo, genero, descripcion, duracion, precio, ocupacion_base) VALUES
      ('Familia Gamuza', 'Circo · Familiar', 'Malabares, acrobacias, zancos, monociclo y humor para toda la familia. Apto todo público.', '70 min', 8000, 0.26),
      ('Ruffo y Truffa: ¡Estoy aburrido!', 'Teatro Clown', 'Grupo Tarán. Comedia absurda sobre el tedio y sus curas inesperadas. Entrada gratuita para socios AEC.', '65 min', 6000, 0.34);

    INSERT INTO funciones (obra_id, fecha, hora) VALUES
      (1, 'Sáb 1 ago', '18:00'),
      (1, 'Dom 2 ago', '18:00'),
      (1, 'Sáb 8 ago', '18:00'),
      (2, 'Vie 31 jul', '20:00'),
      (2, 'Vie 7 ago', '20:00'),
      (2, 'Vie 14 ago', '20:00');
  `);
}
