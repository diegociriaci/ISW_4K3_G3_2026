export interface SolicitudPago {
  monto: number;
  email: string;
  descripcion: string;
  // Identifica la compra en la pasarela, para reconocer luego su pago
  referencia: string;
}

export interface ResultadoPago {
  aprobado: boolean;
  urlRedireccion: string;
  // El comprador paga fuera de la app (Checkout Pro): la compra queda
  // pendiente hasta que se confirme el pago al volver
  confirmacionPendiente?: boolean;
}

export interface EstadoPago {
  aprobado: boolean;
  referencia: string;
  monto: number;
}

export interface PasarelaPago {
  pagar(solicitud: SolicitudPago): Promise<ResultadoPago>;
  // Sólo las pasarelas en las que se paga fuera de la app; null si el pago
  // no existe
  consultarPago?(pagoId: string): Promise<EstadoPago | null>;
}
