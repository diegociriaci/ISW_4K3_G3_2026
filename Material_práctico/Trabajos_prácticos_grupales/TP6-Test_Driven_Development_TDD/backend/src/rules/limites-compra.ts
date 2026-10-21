import type { EntradaSolicitada } from "../entities/entrada-solicitada";
import { TipoPase } from "../entities/tipo-pase";
import {
  CantidadInvalidaError,
  EdadInvalidaError,
  LimiteAcumuladoExcedidoError,
  TipoPaseInvalidoError,
} from "../errors/errores-negocio";

const MIN_ENTRADAS_POR_COMPRA = 1;
const MAX_ENTRADAS_POR_COMPRA = 10;
const MAX_ENTRADAS_POR_USUARIO_Y_FECHA = 10;
const EDAD_MINIMA = 0;
const EDAD_MAXIMA = 120;

const TIPOS_DE_PASE: string[] = Object.values(TipoPase);

export function validarEntradas(entradas: EntradaSolicitada[]): void {
  if (
    entradas.length < MIN_ENTRADAS_POR_COMPRA ||
    entradas.length > MAX_ENTRADAS_POR_COMPRA
  ) {
    throw new CantidadInvalidaError(
      `La cantidad de entradas debe estar entre ${MIN_ENTRADAS_POR_COMPRA} y ${MAX_ENTRADAS_POR_COMPRA}`,
    );
  }

  entradas.forEach(({ edad, tipoPase }, indice) => {
    const visitante = indice + 1;

    if (!Number.isInteger(edad) || edad < EDAD_MINIMA || edad > EDAD_MAXIMA) {
      throw new EdadInvalidaError(
        `La edad del visitante ${visitante} debe ser un entero entre ${EDAD_MINIMA} y ${EDAD_MAXIMA}`,
      );
    }

    if (!TIPOS_DE_PASE.includes(tipoPase)) {
      throw new TipoPaseInvalidoError(
        `El tipo de pase del visitante ${visitante} no es válido`,
      );
    }
  });
}

export function validarLimiteAcumulado(
  yaCompradas: number,
  nuevas: number,
): void {
  if (yaCompradas + nuevas > MAX_ENTRADAS_POR_USUARIO_Y_FECHA) {
    const disponibles = Math.max(
      MAX_ENTRADAS_POR_USUARIO_Y_FECHA - yaCompradas,
      0,
    );
    throw new LimiteAcumuladoExcedidoError(
      `Sólo se pueden comprar ${MAX_ENTRADAS_POR_USUARIO_Y_FECHA} entradas por fecha; quedan ${disponibles} disponibles`,
    );
  }
}
