export interface SolicitudPago {
  monto: number;
  email: string;
  descripcion: string;
}

export interface ResultadoPago {
  aprobado: boolean;
  urlRedireccion: string;
}

export interface PasarelaPago {
  pagar(solicitud: SolicitudPago): Promise<ResultadoPago>;
}
