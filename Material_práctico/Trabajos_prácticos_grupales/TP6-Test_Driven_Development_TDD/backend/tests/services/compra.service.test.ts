import { describe, expect, it, vi } from "vitest";
import type { Compra } from "../../src/entities/compra";
import { FormaPago } from "../../src/entities/forma-pago";
import type { Momento } from "../../src/entities/momento";
import { TipoPase } from "../../src/entities/tipo-pase";
import type { Usuario } from "../../src/entities/usuario";
import type { CompraRepository } from "../../src/repositories/compra.repository";
import type { UsuarioRepository } from "../../src/repositories/usuario.repository";
import type { PasarelaPago } from "../../src/integrations/pasarela-pago";
import type { Notificador } from "../../src/integrations/notificador";
import type { Reloj } from "../../src/config/reloj";
import {
  CompraService,
  type SolicitudCompra,
} from "../../src/services/compra.service";
import {
  CantidadInvalidaError,
  FormaPagoInvalidaError,
  LimiteAcumuladoExcedidoError,
  PagoRechazadoError,
  ParqueCerradoError,
  UsuarioNoRegistradoError,
} from "../../src/errors/errores-negocio";

const AHORA: Momento = { fecha: "2026-10-14", hora: "10:00" }; // miércoles
const FECHA_VISITA = "2026-10-20"; // martes
const LUNES = "2026-10-19";
const URL_MERCADO_PAGO = "https://mercadopago.test/checkout/123";

const USUARIO: Usuario = {
  id: 1,
  nombre: "Ana Pérez",
  email: "ana@mail.com",
};

function crearEscenario({ pagoAprobado = true } = {}) {
  const compras: Compra[] = [];

  const compraRepository: CompraRepository = {
    guardar: vi.fn(async (datos) => {
      const compra: Compra = { ...datos, id: compras.length + 1 };
      compras.push(compra);
      return compra;
    }),
    contarEntradasPorUsuarioYFecha: vi.fn(async (usuarioId, fecha) =>
      compras
        .filter((c) => c.usuarioId === usuarioId && c.fechaVisita === fecha)
        .reduce((total, c) => total + c.entradas.length, 0),
    ),
  };

  const usuarioRepository: UsuarioRepository = {
    buscarPorId: vi.fn(async (id) => (id === USUARIO.id ? USUARIO : null)),
  };

  const pasarelaPago: PasarelaPago = {
    pagar: vi.fn(async () => ({
      aprobado: pagoAprobado,
      urlRedireccion: URL_MERCADO_PAGO,
    })),
  };

  const notificador: Notificador = {
    enviar: vi.fn(async () => {}),
  };

  const reloj: Reloj = { ahora: () => AHORA };

  const service = new CompraService({
    compraRepository,
    usuarioRepository,
    pasarelaPago,
    notificador,
    reloj,
  });

  return { service, compras, compraRepository, pasarelaPago, notificador };
}

function solicitud(cambios: Partial<SolicitudCompra> = {}): SolicitudCompra {
  return {
    usuarioId: USUARIO.id,
    fechaVisita: FECHA_VISITA,
    formaPago: FormaPago.EFECTIVO,
    entradas: [
      { edad: 30, tipoPase: TipoPase.COMUN }, // $10.000
      { edad: 35, tipoPase: TipoPase.VIP }, // $20.000
    ],
    ...cambios,
  };
}

const adultos = (cantidad: number) =>
  Array.from({ length: cantidad }, () => ({
    edad: 30,
    tipoPase: TipoPase.COMUN,
  }));

describe("CompraService.comprar", () => {
  describe("compra válida pagando en efectivo", () => {
    it("registra la compra con el precio de cada entrada y el total", async () => {
      const { service, compras } = crearEscenario();

      await service.comprar(solicitud());

      expect(compras).toHaveLength(1);
      expect(compras[0]).toMatchObject({
        usuarioId: USUARIO.id,
        fechaVisita: FECHA_VISITA,
        formaPago: FormaPago.EFECTIVO,
        total: 30000,
        entradas: [
          { edad: 30, tipoPase: TipoPase.COMUN, precio: 10000 },
          { edad: 35, tipoPase: TipoPase.VIP, precio: 20000 },
        ],
      });
    });

    it("informa la cantidad de entradas compradas y la fecha", async () => {
      const { service } = crearEscenario();

      const resultado = await service.comprar(solicitud());

      expect(resultado).toMatchObject({
        compraId: 1,
        cantidadEntradas: 2,
        fechaVisita: FECHA_VISITA,
        total: 30000,
        mensaje: "Compraste 2 entradas para el 20/10/2026",
      });
    });

    it("no redirige a Mercado Pago", async () => {
      const { service, pasarelaPago } = crearEscenario();

      const resultado = await service.comprar(solicitud());

      expect(resultado.urlRedireccion).toBeNull();
      expect(pasarelaPago.pagar).not.toHaveBeenCalled();
    });

    it("envía el mail de confirmación al usuario", async () => {
      const { service, notificador } = crearEscenario();

      const resultado = await service.comprar(solicitud());

      expect(notificador.enviar).toHaveBeenCalledTimes(1);
      expect(notificador.enviar).toHaveBeenCalledWith(
        expect.objectContaining({ destinatario: USUARIO.email }),
      );
      expect(resultado.emailConfirmacion).toBe(USUARIO.email);
    });
  });

  describe("compra válida pagando con tarjeta", () => {
    // Prueba de usuario: compra con tarjeta mediante Mercado Pago y mail (pasa)
    it("cobra el total en Mercado Pago, redirige y envía el mail", async () => {
      const { service, compras, pasarelaPago, notificador } = crearEscenario();

      const resultado = await service.comprar(
        solicitud({ formaPago: FormaPago.TARJETA }),
      );

      expect(pasarelaPago.pagar).toHaveBeenCalledWith(
        expect.objectContaining({ monto: 30000, email: USUARIO.email }),
      );
      expect(resultado.urlRedireccion).toBe(URL_MERCADO_PAGO);
      expect(compras).toHaveLength(1);
      expect(notificador.enviar).toHaveBeenCalledTimes(1);
    });

    it("si Mercado Pago rechaza el pago, no registra la compra ni envía mail", async () => {
      const { service, compras, notificador } = crearEscenario({
        pagoAprobado: false,
      });

      await expect(
        service.comprar(solicitud({ formaPago: FormaPago.TARJETA })),
      ).rejects.toThrow(PagoRechazadoError);
      expect(compras).toHaveLength(0);
      expect(notificador.enviar).not.toHaveBeenCalled();
    });
  });

  describe("mail de confirmación", () => {
    it("incluye cantidad, fecha, detalle por visitante, forma de pago y total", async () => {
      const { service, notificador } = crearEscenario();

      await service.comprar(
        solicitud({
          entradas: [
            { edad: 30, tipoPase: TipoPase.COMUN },
            { edad: 8, tipoPase: TipoPase.VIP },
            { edad: 2, tipoPase: TipoPase.COMUN },
          ],
        }),
      );

      const [mail] = vi.mocked(notificador.enviar).mock.calls[0] ?? [];
      expect(mail?.asunto).toContain("Confirmación de compra #1");
      expect(mail?.cuerpo).toContain("Cantidad de entradas: 3");
      expect(mail?.cuerpo).toContain("Fecha de visita: 20/10/2026");
      expect(mail?.cuerpo).toContain(
        "Visitante 1: 30 años - Pase Común - $10.000",
      );
      expect(mail?.cuerpo).toContain(
        "Visitante 2: 8 años - Pase VIP - $10.000",
      );
      expect(mail?.cuerpo).toContain("Visitante 3: 2 años - Pase Común - $0");
      expect(mail?.cuerpo).toContain("Forma de pago: Efectivo");
      expect(mail?.cuerpo).toContain("Total: $20.000");
    });
  });

  describe("compras rechazadas", () => {
    // Prueba de usuario: comprar entradas sin seleccionar forma de pago (falla)
    it("rechaza una compra sin forma de pago", async () => {
      const { service } = crearEscenario();

      await expect(
        service.comprar(solicitud({ formaPago: undefined })),
      ).rejects.toThrow(FormaPagoInvalidaError);
    });

    it("rechaza una forma de pago inexistente", async () => {
      const { service } = crearEscenario();

      await expect(
        service.comprar(
          solicitud({ formaPago: "CRIPTO" as unknown as FormaPago }),
        ),
      ).rejects.toThrow(FormaPagoInvalidaError);
    });

    // Prueba de usuario: fecha de visita con el parque cerrado (falla)
    it("rechaza una fecha en la que el parque está cerrado", async () => {
      const { service } = crearEscenario();

      await expect(
        service.comprar(solicitud({ fechaVisita: LUNES })),
      ).rejects.toThrow(ParqueCerradoError);
    });

    // Prueba de usuario: cantidad de entradas mayor a 10 (falla)
    it("rechaza una compra de más de 10 entradas", async () => {
      const { service } = crearEscenario();

      await expect(
        service.comprar(solicitud({ entradas: adultos(11) })),
      ).rejects.toThrow(CantidadInvalidaError);
    });

    it("rechaza superar 10 entradas para la misma fecha sumando compras anteriores", async () => {
      const { service } = crearEscenario();
      await service.comprar(solicitud({ entradas: adultos(6) }));

      await expect(
        service.comprar(solicitud({ entradas: adultos(5) })),
      ).rejects.toThrow(LimiteAcumuladoExcedidoError);
    });

    it("permite comprar para otra fecha aunque ya tenga 10 entradas en una", async () => {
      const { service } = crearEscenario();
      await service.comprar(solicitud({ entradas: adultos(10) }));

      await expect(
        service.comprar(
          solicitud({ fechaVisita: "2026-10-21", entradas: adultos(1) }),
        ),
      ).resolves.toMatchObject({ cantidadEntradas: 1 });
    });

    it("rechaza la compra de un usuario no registrado", async () => {
      const { service } = crearEscenario();

      await expect(
        service.comprar(solicitud({ usuarioId: 999 })),
      ).rejects.toThrow(UsuarioNoRegistradoError);
    });

    it("si una validación falla, no cobra, no registra y no envía mail", async () => {
      const { service, compraRepository, pasarelaPago, notificador } =
        crearEscenario();

      await expect(
        service.comprar(
          solicitud({ fechaVisita: LUNES, formaPago: FormaPago.TARJETA }),
        ),
      ).rejects.toThrow(ParqueCerradoError);
      expect(pasarelaPago.pagar).not.toHaveBeenCalled();
      expect(compraRepository.guardar).not.toHaveBeenCalled();
      expect(notificador.enviar).not.toHaveBeenCalled();
    });
  });
});
