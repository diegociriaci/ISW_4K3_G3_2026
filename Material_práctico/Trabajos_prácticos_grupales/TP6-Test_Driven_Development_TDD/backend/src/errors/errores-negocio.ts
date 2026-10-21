export class ErrorDeNegocio extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class FechaInvalidaError extends ErrorDeNegocio {}

export class FechaPasadaError extends ErrorDeNegocio {}

export class FechaFueraDeVentanaError extends ErrorDeNegocio {}

export class ParqueCerradoError extends ErrorDeNegocio {}

export class HorarioDeCompraVencidoError extends ErrorDeNegocio {}

export class CantidadInvalidaError extends ErrorDeNegocio {}

export class EdadInvalidaError extends ErrorDeNegocio {}

export class TipoPaseInvalidoError extends ErrorDeNegocio {}

export class LimiteAcumuladoExcedidoError extends ErrorDeNegocio {}

export class FormaPagoInvalidaError extends ErrorDeNegocio {}

export class UsuarioNoRegistradoError extends ErrorDeNegocio {}

export class PagoRechazadoError extends ErrorDeNegocio {}

// El body de la solicitud no tiene el formato esperado
export class SolicitudInvalidaError extends ErrorDeNegocio {}
