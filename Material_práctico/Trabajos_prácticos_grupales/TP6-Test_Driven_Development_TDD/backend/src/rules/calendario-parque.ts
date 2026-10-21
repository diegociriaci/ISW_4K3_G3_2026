import type { Momento } from "../entities/momento";
import {
  FechaFueraDeVentanaError,
  FechaInvalidaError,
  FechaPasadaError,
  HorarioDeCompraVencidoError,
  ParqueCerradoError,
} from "../errors/errores-negocio";
import {
  diaDeLaSemana,
  esFechaValida,
  mesYDia,
  mismoDiaDelMesSiguiente,
} from "../utils/fechas";

const LUNES = 1;
const FERIADOS_FIJOS = ["12-25", "01-01"]; // MM-DD
const HORA_LIMITE_MISMO_DIA = "17:30";

export function estaAbierto(fecha: string): boolean {
  return (
    diaDeLaSemana(fecha) !== LUNES && !FERIADOS_FIJOS.includes(mesYDia(fecha))
  );
}

// Las fechas "YYYY-MM-DD" y horas "HH:mm" se comparan como texto.
export function validarFechaVisita(fecha: string, ahora: Momento): void {
  if (!esFechaValida(fecha)) {
    throw new FechaInvalidaError(`La fecha '${fecha}' no es válida`);
  }

  if (fecha < ahora.fecha) {
    throw new FechaPasadaError("La fecha de visita no puede ser pasada");
  }

  if (fecha > mismoDiaDelMesSiguiente(ahora.fecha)) {
    throw new FechaFueraDeVentanaError(
      "Sólo se pueden comprar entradas con hasta 1 mes de anticipación",
    );
  }

  if (!estaAbierto(fecha)) {
    throw new ParqueCerradoError("El parque está cerrado en la fecha elegida");
  }

  if (fecha === ahora.fecha && ahora.hora > HORA_LIMITE_MISMO_DIA) {
    throw new HorarioDeCompraVencidoError(
      `Para el día de hoy sólo se puede comprar hasta las ${HORA_LIMITE_MISMO_DIA}`,
    );
  }
}
