import request from "supertest";
import { describe, expect, it } from "vitest";
import crearApp from "../../src/app";
import type { Momento } from "../../src/entities/momento";
import CompraRepositoryEnMemoria from "../../src/repositories/memoria/compra.repository.memoria";
import UsuarioRepositoryEnMemoria from "../../src/repositories/memoria/usuario.repository.memoria";
import MercadoPagoSimulado from "../../src/integrations/mercado-pago-simulado";
import NotificadorMailSimulado from "../../src/integrations/notificador-mail-simulado";
import type { PasarelaPago } from "../../src/integrations/pasarela-pago";
import { CompraService } from "../../src/services/compra.service";
import CalendarioService from "../../src/services/calendario.service";

const USUARIO = { id: 1, nombre: "Ana Pérez", email: "ana@mail.com" };
const MIERCOLES_A_LA_MANANA: Momento = { fecha: "2026-10-14", hora: "10:00" };
const URL_CHECKOUT = "http://localhost:5173/mercado-pago";

interface OpcionesAppDePrueba {
  ahora?: Momento;
  pagoAprobado?: boolean;
  pasarelaPago?: PasarelaPago;
}

function crearAppDePrueba({
  ahora = MIERCOLES_A_LA_MANANA,
  pagoAprobado = true,
  pasarelaPago = new MercadoPagoSimulado({
    urlCheckout: URL_CHECKOUT,
    aprobado: pagoAprobado,
  }),
}: OpcionesAppDePrueba = {}) {
  const reloj = { ahora: () => ahora };
  const compraService = new CompraService({
    compraRepository: new CompraRepositoryEnMemoria(),
    usuarioRepository: new UsuarioRepositoryEnMemoria([USUARIO]),
    pasarelaPago,
    notificador: new NotificadorMailSimulado(),
    reloj,
  });
  const calendarioService = new CalendarioService(reloj);

  return crearApp({ compraService, calendarioService });
}

const compraValida = {
  fechaVisita: "2026-10-20",
  formaPago: "EFECTIVO",
  entradas: [
    { edad: 30, tipoPase: "COMUN" },
    { edad: 35, tipoPase: "VIP" },
  ],
};

function postCompra(app: ReturnType<typeof crearApp>, body: object) {
  return request(app)
    .post("/api/compras")
    .set("x-usuario-id", String(USUARIO.id))
    .send(body);
}

describe("POST /api/compras", () => {
  it("registra una compra en efectivo y responde 201 con cantidad y fecha", async () => {
    const respuesta = await postCompra(crearAppDePrueba(), compraValida);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toEqual({
      compraId: 1,
      cantidadEntradas: 2,
      fechaVisita: "2026-10-20",
      total: 30000,
      urlRedireccion: null,
      emailConfirmacion: USUARIO.email,
      mensaje: "Compraste 2 entradas para el 20/10/2026",
    });
  });

  it("con tarjeta responde la URL de Mercado Pago a la que redirigir", async () => {
    const respuesta = await postCompra(crearAppDePrueba(), {
      ...compraValida,
      formaPago: "TARJETA",
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.urlRedireccion).toBe(`${URL_CHECKOUT}?monto=30000`);
  });

  describe("usuario no registrado → 401", () => {
    it("sin sesión (sin header x-usuario-id)", async () => {
      const respuesta = await request(crearAppDePrueba())
        .post("/api/compras")
        .send(compraValida);

      expect(respuesta.status).toBe(401);
    });

    it("con un usuario inexistente", async () => {
      const respuesta = await request(crearAppDePrueba())
        .post("/api/compras")
        .set("x-usuario-id", "999")
        .send(compraValida);

      expect(respuesta.status).toBe(401);
      expect(respuesta.body.error.tipo).toBe("UsuarioNoRegistradoError");
    });
  });

  describe("body con formato inválido → 400", () => {
    it.each([
      ["sin entradas", { ...compraValida, entradas: undefined }],
      ["entradas que no son una lista", { ...compraValida, entradas: "dos" }],
      [
        "edad que no es un número",
        { ...compraValida, entradas: [{ edad: "treinta", tipoPase: "VIP" }] },
      ],
      ["sin fecha de visita", { ...compraValida, fechaVisita: undefined }],
    ])("%s", async (_caso, body) => {
      const respuesta = await postCompra(crearAppDePrueba(), body);

      expect(respuesta.status).toBe(400);
      expect(respuesta.body.error.tipo).toBe("SolicitudInvalidaError");
      expect(respuesta.body.error.mensaje).toEqual(expect.any(String));
    });
  });

  describe("reglas de negocio incumplidas → 422", () => {
    it.each([
      [
        "sin forma de pago",
        { ...compraValida, formaPago: undefined },
        "FormaPagoInvalidaError",
      ],
      [
        "fecha con el parque cerrado",
        { ...compraValida, fechaVisita: "2026-10-19" },
        "ParqueCerradoError",
      ],
      [
        "más de 10 entradas",
        {
          ...compraValida,
          entradas: Array(11).fill({ edad: 30, tipoPase: "COMUN" }),
        },
        "CantidadInvalidaError",
      ],
      [
        "edad fuera de rango",
        { ...compraValida, entradas: [{ edad: 130, tipoPase: "COMUN" }] },
        "EdadInvalidaError",
      ],
    ])("%s", async (_caso, body, tipoError) => {
      const respuesta = await postCompra(crearAppDePrueba(), body);

      expect(respuesta.status).toBe(422);
      expect(respuesta.body.error.tipo).toBe(tipoError);
    });
  });

  it("si Mercado Pago rechaza el pago responde 402", async () => {
    const respuesta = await postCompra(
      crearAppDePrueba({ pagoAprobado: false }),
      { ...compraValida, formaPago: "TARJETA" },
    );

    expect(respuesta.status).toBe(402);
    expect(respuesta.body.error.tipo).toBe("PagoRechazadoError");
  });
});

// Como Checkout Pro: se paga fuera de la app y el pago se consulta al volver
function crearCheckoutProDePrueba({ pagoAprobado = true } = {}): PasarelaPago {
  let referenciaPagada = "";
  return {
    async pagar({ referencia }) {
      referenciaPagada = referencia;
      return {
        aprobado: true,
        urlRedireccion: "https://www.mercadopago.com.ar/checkout",
        confirmacionPendiente: true,
      };
    },
    async consultarPago(pagoId) {
      return {
        aprobado: pagoAprobado,
        referencia: pagoId === "999" ? referenciaPagada : "desconocida",
        monto: 30000,
      };
    },
  };
}

function postConfirmarPago(app: ReturnType<typeof crearApp>, body: object) {
  return request(app)
    .post("/api/compras/confirmar-pago")
    .set("x-usuario-id", String(USUARIO.id))
    .send(body);
}

describe("POST /api/compras/confirmar-pago", () => {
  async function appConCompraPendiente(opciones = {}) {
    const app = crearAppDePrueba({
      pasarelaPago: crearCheckoutProDePrueba(opciones),
    });
    await postCompra(app, { ...compraValida, formaPago: "TARJETA" });
    return app;
  }

  it("confirma el pago aprobado y responde la compra confirmada", async () => {
    const app = await appConCompraPendiente();

    const respuesta = await postConfirmarPago(app, { pagoId: "999" });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({
      compraId: 1,
      cantidadEntradas: 2,
      fechaVisita: "2026-10-20",
      total: 30000,
      urlRedireccion: null,
      emailConfirmacion: USUARIO.email,
      mensaje: "Compraste 2 entradas para el 20/10/2026",
    });
  });

  it("si el pago no fue aprobado responde 402", async () => {
    const app = await appConCompraPendiente({ pagoAprobado: false });

    const respuesta = await postConfirmarPago(app, { pagoId: "999" });

    expect(respuesta.status).toBe(402);
    expect(respuesta.body.error.tipo).toBe("PagoRechazadoError");
  });

  it("si el pago no corresponde a ninguna compra responde 404", async () => {
    const app = await appConCompraPendiente();

    const respuesta = await postConfirmarPago(app, { pagoId: "123" });

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error.tipo).toBe("CompraInexistenteError");
  });

  it("sin el id del pago responde 400", async () => {
    const app = await appConCompraPendiente();

    const respuesta = await postConfirmarPago(app, {});

    expect(respuesta.status).toBe(400);
  });
});

describe("POST /api/compras/cotizar", () => {
  it("devuelve el precio de cada entrada y el total", async () => {
    const respuesta = await request(crearAppDePrueba())
      .post("/api/compras/cotizar")
      .send({
        entradas: [
          { edad: 30, tipoPase: "VIP" },
          { edad: 10, tipoPase: "COMUN" },
          { edad: 2, tipoPase: "COMUN" },
        ],
      });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({
      entradas: [
        { edad: 30, tipoPase: "VIP", precio: 20000 },
        { edad: 10, tipoPase: "COMUN", precio: 5000 },
        { edad: 2, tipoPase: "COMUN", precio: 0 },
      ],
      total: 25000,
    });
  });

  it("rechaza entradas inválidas con 422", async () => {
    const respuesta = await request(crearAppDePrueba())
      .post("/api/compras/cotizar")
      .send({ entradas: [{ edad: 30, tipoPase: "PLATINO" }] });

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.error.tipo).toBe("TipoPaseInvalidoError");
  });
});

describe("GET /api/calendario", () => {
  it("devuelve los días desde hoy hasta 1 mes después indicando si están habilitados", async () => {
    const respuesta = await request(crearAppDePrueba()).get("/api/calendario");

    expect(respuesta.status).toBe(200);
    const { dias } = respuesta.body;
    expect(dias).toHaveLength(32); // 14/10 al 14/11 inclusive
    expect(dias[0]).toEqual({ fecha: "2026-10-14", habilitado: true });
    expect(dias.at(-1).fecha).toBe("2026-11-14");
    expect(dias).toContainEqual({
      fecha: "2026-10-19",
      habilitado: false,
      motivo: "El parque está cerrado en la fecha elegida",
    });
  });

  it("después de las 17:30 el día de hoy no está habilitado", async () => {
    const respuesta = await request(
      crearAppDePrueba({ ahora: { fecha: "2026-10-14", hora: "18:00" } }),
    ).get("/api/calendario");

    expect(respuesta.body.dias[0]).toMatchObject({
      fecha: "2026-10-14",
      habilitado: false,
    });
  });
});
