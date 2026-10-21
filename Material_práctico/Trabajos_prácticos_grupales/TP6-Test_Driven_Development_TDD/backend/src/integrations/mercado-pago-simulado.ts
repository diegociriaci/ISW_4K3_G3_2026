import type {
  PasarelaPago,
  ResultadoPago,
  SolicitudPago,
} from "./pasarela-pago";

interface OpcionesMercadoPagoSimulado {
  urlCheckout: string;
  aprobado?: boolean;
}

// Simula Mercado Pago (FAQ 4): no cobra, sólo devuelve la URL a la que se
// redirige al usuario, que muestra la pantalla de compra exitosa.
export default class MercadoPagoSimulado implements PasarelaPago {
  private readonly urlCheckout: string;

  private readonly aprobado: boolean;

  constructor({ urlCheckout, aprobado = true }: OpcionesMercadoPagoSimulado) {
    this.urlCheckout = urlCheckout;
    this.aprobado = aprobado;
  }

  async pagar({ monto }: SolicitudPago): Promise<ResultadoPago> {
    return {
      aprobado: this.aprobado,
      urlRedireccion: `${this.urlCheckout}?monto=${monto}`,
    };
  }
}
