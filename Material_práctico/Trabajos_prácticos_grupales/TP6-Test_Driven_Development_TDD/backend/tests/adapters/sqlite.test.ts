import { beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import crearBaseDeDatos, { migrarBaseDeDatos } from "../../src/database/sqlite";
import type { Compra } from "../../src/entities/compra";
import { FormaPago } from "../../src/entities/forma-pago";
import { TipoPase } from "../../src/entities/tipo-pase";
import CompraRepositorySQLite from "../../src/repositories/sqlite/compra.repository.sqlite";
import UsuarioRepositorySQLite from "../../src/repositories/sqlite/usuario.repository.sqlite";

const USUARIO = { id: 1, nombre: "Ana Pérez", email: "ana@mail.com" };

const compraSinId = (
  usuarioId: number,
  fechaVisita: string,
  cantidad: number,
): Omit<Compra, "id"> => ({
  usuarioId,
  fechaVisita,
  formaPago: FormaPago.EFECTIVO,
  entradas: Array.from({ length: cantidad }, () => ({
    edad: 30,
    tipoPase: TipoPase.COMUN,
    precio: 10000,
  })),
  total: cantidad * 10000,
});

let db: Database.Database;

beforeEach(() => {
  db = crearBaseDeDatos(":memory:", USUARIO);
  db.prepare(
    "INSERT INTO usuarios (id, nombre, email) VALUES (2, 'Juan', 'juan@mail.com')",
  ).run();
});

describe("CompraRepositorySQLite", () => {
  it("guarda una compra con sus entradas asignándole un id incremental", async () => {
    const repositorio = new CompraRepositorySQLite(db);

    const primera = await repositorio.guardar(compraSinId(1, "2026-10-20", 2));
    const segunda = await repositorio.guardar(compraSinId(1, "2026-10-20", 1));

    expect(primera.id).toBe(1);
    expect(segunda.id).toBe(2);
    expect(primera).toMatchObject(compraSinId(1, "2026-10-20", 2));
    expect(
      db.prepare("SELECT COUNT(*) AS cantidad FROM entradas").get(),
    ).toEqual({ cantidad: 3 });
  });

  it("cuenta las entradas de un usuario para una fecha", async () => {
    const repositorio = new CompraRepositorySQLite(db);
    await repositorio.guardar(compraSinId(1, "2026-10-20", 3));
    await repositorio.guardar(compraSinId(1, "2026-10-20", 4));
    await repositorio.guardar(compraSinId(1, "2026-10-21", 5)); // otra fecha
    await repositorio.guardar(compraSinId(2, "2026-10-20", 6)); // otro usuario

    await expect(
      repositorio.contarEntradasPorUsuarioYFecha(1, "2026-10-20"),
    ).resolves.toBe(7);
  });

  it("devuelve 0 si el usuario no compró para esa fecha", async () => {
    const repositorio = new CompraRepositorySQLite(db);

    await expect(
      repositorio.contarEntradasPorUsuarioYFecha(1, "2026-10-20"),
    ).resolves.toBe(0);
  });

  describe("compras pendientes de pago (Checkout Pro)", () => {
    const compraPendiente = (): Omit<Compra, "id"> => ({
      ...compraSinId(1, "2026-10-20", 2),
      formaPago: FormaPago.TARJETA,
      referenciaPago: "ref-123",
      pendienteDePago: true,
    });

    it("busca una compra con sus entradas por la referencia del pago", async () => {
      const repositorio = new CompraRepositorySQLite(db);
      await repositorio.guardar(compraSinId(1, "2026-10-20", 1));
      await repositorio.guardar(compraPendiente());

      await expect(
        repositorio.buscarPorReferenciaPago("ref-123"),
      ).resolves.toEqual({ ...compraPendiente(), id: 2 });
    });

    it("devuelve null si ninguna compra tiene esa referencia", async () => {
      const repositorio = new CompraRepositorySQLite(db);
      await repositorio.guardar(compraPendiente());

      await expect(
        repositorio.buscarPorReferenciaPago("otra"),
      ).resolves.toBeNull();
    });

    it("confirma el pago una sola vez", async () => {
      const repositorio = new CompraRepositorySQLite(db);
      const compra = await repositorio.guardar(compraPendiente());

      await expect(repositorio.confirmarPago(compra.id)).resolves.toBe(true);
      await expect(repositorio.confirmarPago(compra.id)).resolves.toBe(false);
      await expect(
        repositorio.buscarPorReferenciaPago("ref-123"),
      ).resolves.toMatchObject({ pendienteDePago: false });
    });

    it("agrega las columnas nuevas a una base creada antes de Checkout Pro", async () => {
      const vieja = new Database(":memory:");
      vieja.exec(`
        CREATE TABLE compras (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usuario_id INTEGER NOT NULL,
          fecha_visita TEXT NOT NULL,
          forma_pago TEXT NOT NULL,
          total INTEGER NOT NULL
        );
      `);

      migrarBaseDeDatos(vieja);

      const columnas = (
        vieja.prepare("PRAGMA table_info(compras)").all() as { name: string }[]
      ).map((c) => c.name);
      expect(columnas).toEqual(
        expect.arrayContaining(["referencia_pago", "pendiente_pago"]),
      );
    });
  });
});

describe("UsuarioRepositorySQLite", () => {
  it("encuentra el usuario precargado por su id", async () => {
    const repositorio = new UsuarioRepositorySQLite(db);

    await expect(repositorio.buscarPorId(1)).resolves.toEqual(USUARIO);
  });

  it("devuelve null si el usuario no está registrado", async () => {
    const repositorio = new UsuarioRepositorySQLite(db);

    await expect(repositorio.buscarPorId(99)).resolves.toBeNull();
  });
});
