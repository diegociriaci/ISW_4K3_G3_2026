import type { EntradaSolicitada } from "./entrada-solicitada";
import type { FormaPago } from "./forma-pago";

export interface EntradaComprada extends EntradaSolicitada {
  precio: number;
}

export interface Compra {
  id: number;
  usuarioId: number;
  fechaVisita: string;
  formaPago: FormaPago;
  entradas: EntradaComprada[];
  total: number;
  // Pago con Checkout Pro: referencia del pago en Mercado Pago y si todavía
  // no se confirmó
  referenciaPago?: string;
  pendienteDePago?: boolean;
}
