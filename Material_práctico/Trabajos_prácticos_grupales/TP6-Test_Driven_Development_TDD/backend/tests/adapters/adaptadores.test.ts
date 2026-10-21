import { describe, expect, it } from "vitest";
import type { Compra } from "../../src/entities/compra";
import { FormaPago } from "../../src/entities/forma-pago";
import { TipoPase } from "../../src/entities/tipo-pase";
import CompraRepositoryEnMemoria from "../../src/repositories/memoria/compra.repository.memoria";
import UsuarioRepositoryEnMemoria from "../../src/repositories/memoria/usuario.repository.memoria";
import MercadoPagoSimulado from "../../src/integrations/mercado-pago-simulado";
import NotificadorMailSimulado from "../../src/integrations/notificador-mail-simulado";
import { RelojSistema } from "../../src/config/reloj";

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

describe("CompraRepositoryEnMemoria", () => {
  it("guarda una compra asignándole un id incremental", async () => {
    const repositorio = new CompraRepositoryEnMemoria();

    const primera = await repositorio.guardar(compraSinId(1, "2026-10-20", 2));
    const segunda = await repositorio.guardar(compraSinId(1, "2026-10-20", 1));

    expect(primera.id).toBe(1);
    expect(segunda.id).toBe(2);
    expect(primera).toMatchObject(compraSinId(1, "2026-10-20", 2));
  });

  it("cuenta las entradas de un usuario para una fecha", async () => {
    const repositorio = new CompraRepositoryEnMemoria();
    await repositorio.guardar(compraSinId(1, "2026-10-20", 3));
    await repositorio.guardar(compraSinId(1, "2026-10-20", 4));
    await repositorio.guardar(compraSinId(1, "2026-10-21", 5)); // otra fecha
    await repositorio.guardar(compraSinId(2, "2026-10-20", 6)); // otro usuario

    await expect(
      repositorio.contarEntradasPorUsuarioYFecha(1, "2026-10-20"),
    ).resolves.toBe(7);
  });

  it("devuelve 0 si el usuario no compró para esa fecha", async () => {
    const repositorio = new CompraRepositoryEnMemoria();

    await expect(
      repositorio.contarEntradasPorUsuarioYFecha(1, "2026-10-20"),
    ).resolves.toBe(0);
  });
});

describe("UsuarioRepositoryEnMemoria", () => {
  const usuario = { id: 1, nombre: "Ana Pérez", email: "ana@mail.com" };

  it("encuentra un usuario registrado por su id", async () => {
    const repositorio = new UsuarioRepositoryEnMemoria([usuario]);

    await expect(repositorio.buscarPorId(1)).resolves.toEqual(usuario);
  });

  it("devuelve null si el usuario no está registrado", async () => {
    const repositorio = new UsuarioRepositoryEnMemoria([usuario]);

    await expect(repositorio.buscarPorId(99)).resolves.toBeNull();
  });
});

describe("MercadoPagoSimulado", () => {
  const solicitud = {
    monto: 30000,
    email: "ana@mail.com",
    descripcion: "2 entradas",
  };

  it("aprueba el pago y devuelve la URL de checkout con el monto", async () => {
    const pasarela = new MercadoPagoSimulado({
      urlCheckout: "http://localhost:5173/mercado-pago",
    });

    const resultado = await pasarela.pagar(solicitud);

    expect(resultado.aprobado).toBe(true);
    expect(resultado.urlRedireccion).toBe(
      "http://localhost:5173/mercado-pago?monto=30000",
    );
  });

  it("puede configurarse para rechazar el pago", async () => {
    const pasarela = new MercadoPagoSimulado({
      urlCheckout: "http://localhost:5173/mercado-pago",
      aprobado: false,
    });

    await expect(pasarela.pagar(solicitud)).resolves.toMatchObject({
      aprobado: false,
    });
  });
});

describe("NotificadorMailSimulado", () => {
  it("registra los mails enviados", async () => {
    const notificador = new NotificadorMailSimulado();
    const mail = { destinatario: "ana@mail.com", asunto: "Hola", cuerpo: "…" };

    await notificador.enviar(mail);

    expect(notificador.enviados).toEqual([mail]);
  });
});

describe("RelojSistema", () => {
  it("devuelve la fecha y hora actuales en la zona horaria de Argentina", () => {
    // 02:30 UTC del 15/10 son las 23:30 del 14/10 en Argentina (UTC-3)
    const reloj = new RelojSistema(() => new Date("2026-10-15T02:30:00Z"));

    expect(reloj.ahora()).toEqual({ fecha: "2026-10-14", hora: "23:30" });
  });

  it("formatea la medianoche como 00:00", () => {
    const reloj = new RelojSistema(() => new Date("2026-10-15T03:00:00Z"));

    expect(reloj.ahora()).toEqual({ fecha: "2026-10-15", hora: "00:00" });
  });
});
