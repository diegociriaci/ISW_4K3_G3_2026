import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import type {
  EstadoPago,
  PasarelaPago,
  ResultadoPago,
  SolicitudPago,
} from "./pasarela-pago";

// Mercado Pago responde 404 cuando el id del pago no existe
const STATUS_NO_ENCONTRADO = 404;

interface OpcionesMercadoPagoCheckoutPro {
  accessToken: string;
  // Pantalla de la app a la que vuelve el comprador después de pagar
  urlRetorno: string;
  // Con credenciales de prueba se paga en el checkout de prueba (sandbox)
  entornoPrueba?: boolean;
}

// Integración real con Mercado Pago Checkout Pro: crea una preferencia de
// pago y devuelve la URL de Mercado Pago a la que se redirige al comprador.
// El pago se hace en Mercado Pago, que al terminar vuelve a la app con el id
// del pago para consultarlo y confirmar la compra.
export default class MercadoPagoCheckoutPro implements PasarelaPago {
  private readonly preferencias: Preference;

  private readonly pagos: Payment;

  private readonly urlRetorno: string;

  private readonly entornoPrueba: boolean;

  constructor({
    accessToken,
    urlRetorno,
    entornoPrueba = false,
  }: OpcionesMercadoPagoCheckoutPro) {
    const configuracion = new MercadoPagoConfig({ accessToken });
    this.preferencias = new Preference(configuracion);
    this.pagos = new Payment(configuracion);
    this.urlRetorno = urlRetorno;
    this.entornoPrueba = entornoPrueba;
  }

  async pagar({
    monto,
    email,
    descripcion,
    referencia,
  }: SolicitudPago): Promise<ResultadoPago> {
    const preferencia = await this.preferencias.create({
      body: {
        items: [
          {
            id: "entradas",
            title: descripcion,
            quantity: 1,
            unit_price: monto,
            currency_id: "ARS",
          },
        ],
        payer: { email },
        // Mercado Pago la devuelve en el pago para reconocer la compra
        external_reference: referencia,
        back_urls: {
          success: this.urlRetorno,
          pending: this.urlRetorno,
          failure: this.urlRetorno,
        },
        // Mercado Pago rechaza auto_return si la URL de retorno no es https
        // (por ejemplo, localhost durante el desarrollo)
        ...(this.urlRetorno.startsWith("https://") && {
          auto_return: "approved",
        }),
      },
    });

    const urlPago = this.entornoPrueba
      ? preferencia.sandbox_init_point
      : preferencia.init_point;
    if (!urlPago) {
      throw new Error("Mercado Pago no devolvió la URL de pago");
    }
    return {
      aprobado: true,
      urlRedireccion: urlPago,
      confirmacionPendiente: true,
    };
  }

  async consultarPago(pagoId: string): Promise<EstadoPago | null> {
    let pago;
    try {
      pago = await this.pagos.get({ id: pagoId });
    } catch (error) {
      if ((error as { status?: number }).status === STATUS_NO_ENCONTRADO) {
        return null;
      }
      throw error;
    }

    return {
      aprobado: pago.status === "approved",
      referencia: pago.external_reference ?? "",
      monto: pago.transaction_amount ?? 0,
    };
  }
}
