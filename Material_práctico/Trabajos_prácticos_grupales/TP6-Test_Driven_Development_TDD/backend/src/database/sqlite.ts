import Database from "better-sqlite3";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";
import type { Usuario } from "../entities/usuario";

export default function crearBaseDeDatos(
  ruta: string,
  usuarioInicial: Usuario,
): Database.Database {
  // ":memory:" crea una base temporal (se usa en los tests)
  const enMemoria = ruta === ":memory:";
  const rutaAbsoluta = enMemoria ? ruta : resolve(ruta);
  if (!enMemoria) {
    mkdirSync(dirname(rutaAbsoluta), { recursive: true });
  }

  const db = new Database(rutaAbsoluta);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS compras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      fecha_visita TEXT NOT NULL,
      forma_pago TEXT NOT NULL CHECK (forma_pago IN ('EFECTIVO', 'TARJETA')),
      total INTEGER NOT NULL CHECK (total >= 0),
      creada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS entradas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      compra_id INTEGER NOT NULL,
      edad INTEGER NOT NULL CHECK (edad BETWEEN 0 AND 120),
      tipo_pase TEXT NOT NULL CHECK (tipo_pase IN ('COMUN', 'VIP')),
      precio INTEGER NOT NULL CHECK (precio >= 0),
      FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_compras_usuario_fecha
      ON compras(usuario_id, fecha_visita);
    CREATE INDEX IF NOT EXISTS idx_entradas_compra
      ON entradas(compra_id);
  `);

  db.prepare(
    `INSERT INTO usuarios (id, nombre, email)
     VALUES (@id, @nombre, @email)
     ON CONFLICT(id) DO UPDATE SET
       nombre = excluded.nombre,
       email = excluded.email`,
  ).run(usuarioInicial);

  return db;
}
