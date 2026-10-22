/* eslint-disable max-classes-per-file -- dobles de las clases del SDK */
import { beforeEach, describe, expect, it, vi } from "vitest";
import MercadoPagoCheckoutPro from "../../src/integrations/mercado-pago-checkout-pro";

const { create, get, configuraciones } = vi.hoisted(() => ({
  create: vi.fn(),
  get: vi.fn(),
  configuraciones: [] as unknown[],
}));

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: class {
    constructor(configuracion: unknown) {
      configuraciones.push(configuracion);
    }
  },
  Preference: class {
    create = create;
  },
  Payment: class {
    get = get;
  },
}));

const URL_CHECKOUT =
  "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=123";

const URL_CHECKOUT_PRUEBA =
  "https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=123";

const SOLICITUD = {
  monto: 30000,
  email: "ana@mail.com",
  descripcion: "2 entradas EcoHarmony Park - 20/10/2026",
  referencia: "ref-123",
};

beforeEach(() => {
  create.mockReset();
  get.mockReset();
  configuraciones.length = 0;
  create.mockResolvedValue({ id: "123", init_point: URL_CHECKOUT });
});

describe("MercadoPagoCheckoutPro", () => {
  it("se autentica con el access token", async () => {
    const pasarela = new MercadoPagoCheckoutPro({
      accessToken: "TEST-token",
      urlRetorno: "http://localhost:5173/confirmacion",
    });

    await pasarela.pagar(SOLICITUD);

    expect(configuraciones).toEqual([{ accessToken: "TEST-token" }]);
  });

  it("crea una preferencia con el monto, la descripción y el email del comprador", async () => {
    const pasarela = new MercadoPagoCheckoutPro({
      accessToken: "TEST-token",
      urlRetorno: "http://localhost:5173/confirmacion",
    });

    await pasarela.pagar(SOLICITUD);

    expect(create).toHaveBeenCalledWith({
      body: expect.objectContaining({
        items: [
          {
            id: "entradas",
            title: "2 entradas EcoHarmony Park - 20/10/2026",
            quantity: 1,
            unit_price: 30000,
            currency_id: "ARS",
          },
        ],
        payer: { email: "ana@mail.com" },
        // Con esta referencia se reconoce la compra cuando vuelve el pago
        external_reference: "ref-123",
      }),
    });
  });

  it("al terminar el pago, Mercado Pago vuelve a la URL de retorno", async () => {
    const pasarela = new MercadoPagoCheckoutPro({
      accessToken: "TEST-token",
      urlRetorno: "http://localhost:5173/confirmacion",
    });

    await pasarela.pagar(SOLICITUD);

    const { body } = create.mock.calls[0]?.[0] as {
      body: { back_urls: unknown; auto_return?: string };
    };
    expect(body.back_urls).toEqual({
      success: "http://localhost:5173/confirmacion",
      pending: "http://localhost:5173/confirmacion",
      failure: "http://localhost:5173/confirmacion",
    });
    // Mercado Pago rechaza auto_return con URLs que no son https
    expect(body.auto_return).toBeUndefined();
  });

  it("con una URL de retorno https vuelve automáticamente si el pago se aprueba", async () => {
    const pasarela = new MercadoPagoCheckoutPro({
      accessToken: "TEST-token",
      urlRetorno: "https://ecoharmony.com/confirmacion",
    });

    await pasarela.pagar(SOLICITUD);

    expect(create).toHaveBeenCalledWith({
      body: expect.objectContaining({ auto_return: "approved" }),
    });
  });

  it("devuelve la URL de Checkout Pro a la que se redirige al comprador", async () => {
    const pasarela = new MercadoPagoCheckoutPro({
      accessToken: "TEST-token",
      urlRetorno: "http://localhost:5173/confirmacion",
    });

    await expect(pasarela.pagar(SOLICITUD)).resolves.toEqual({
      aprobado: true,
      urlRedireccion: URL_CHECKOUT,
      // El comprador paga en Mercado Pago: el pago se confirma al volver
      confirmacionPendiente: true,
    });
  });

  it("en el entorno de prueba devuelve la URL de checkout de prueba (sandbox)", async () => {
    create.mockResolvedValue({
      id: "123",
      init_point: URL_CHECKOUT,
      sandbox_init_point: URL_CHECKOUT_PRUEBA,
    });
    const pasarela = new MercadoPagoCheckoutPro({
      accessToken: "TEST-token",
      urlRetorno: "http://localhost:5173/confirmacion",
      entornoPrueba: true,
    });

    await expect(pasarela.pagar(SOLICITUD)).resolves.toEqual({
      aprobado: true,
      urlRedireccion: URL_CHECKOUT_PRUEBA,
      confirmacionPendiente: true,
    });
  });

  it("si Mercado Pago no devuelve la URL de checkout, lo informa", async () => {
    create.mockResolvedValue({ id: "123" });
    const pasarela = new MercadoPagoCheckoutPro({
      accessToken: "TEST-token",
      urlRetorno: "http://localhost:5173/confirmacion",
    });

    await expect(pasarela.pagar(SOLICITUD)).rejects.toThrow(
      "Mercado Pago no devolvió la URL de pago",
    );
  });
});

describe("MercadoPagoCheckoutPro.consultarPago", () => {
  const pasarela = () =>
    new MercadoPagoCheckoutPro({
      accessToken: "TEST-token",
      urlRetorno: "http://localhost:5173/confirmacion",
    });

  it("consulta el pago en Mercado Pago y devuelve su estado, referencia y monto", async () => {
    get.mockResolvedValue({
      id: 999,
      status: "approved",
      external_reference: "ref-123",
      transaction_amount: 30000,
    });

    await expect(pasarela().consultarPago("999")).resolves.toEqual({
      aprobado: true,
      referencia: "ref-123",
      monto: 30000,
    });
    expect(get).toHaveBeenCalledWith({ id: "999" });
  });

  it("un pago que no está aprobado (rechazado, pendiente) no se considera aprobado", async () => {
    get.mockResolvedValue({
      id: 999,
      status: "rejected",
      external_reference: "ref-123",
      transaction_amount: 30000,
    });

    await expect(pasarela().consultarPago("999")).resolves.toMatchObject({
      aprobado: false,
    });
  });

  it("si el pago no existe en Mercado Pago devuelve null", async () => {
    get.mockRejectedValue(
      Object.assign(new Error("Payment not found"), { status: 404 }),
    );

    await expect(pasarela().consultarPago("123")).resolves.toBeNull();
  });

  it("cualquier otro error de Mercado Pago se propaga", async () => {
    get.mockRejectedValue(
      Object.assign(new Error("Service unavailable"), { status: 503 }),
    );

    await expect(pasarela().consultarPago("999")).rejects.toThrow(
      "Service unavailable",
    );
  });
});
