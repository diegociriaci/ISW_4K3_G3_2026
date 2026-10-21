// Tipos del contrato con la API del backend

export type TipoPase = "COMUN" | "VIP";

export type FormaPago = "EFECTIVO" | "TARJETA";

export interface EntradaSolicitada {
  edad: number;
  tipoPase: TipoPase;
}

export interface DiaCalendario {
  fecha: string;
  habilitado: boolean;
  motivo?: string;
}

export interface Calendario {
  desde: string;
  hasta: string;
  dias: DiaCalendario[];
}

export interface Cotizacion {
  entradas: (EntradaSolicitada & { precio: number })[];
  total: number;
}

export interface SolicitudCompra {
  fechaVisita: string;
  formaPago: FormaPago;
  entradas: EntradaSolicitada[];
}

export interface ResultadoCompra {
  compraId: number;
  cantidadEntradas: number;
  fechaVisita: string;
  total: number;
  urlRedireccion: string | null;
  emailConfirmacion: string;
  mensaje: string;
}
