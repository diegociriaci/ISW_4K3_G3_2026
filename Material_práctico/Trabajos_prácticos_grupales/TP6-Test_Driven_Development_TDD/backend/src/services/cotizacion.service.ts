import type { EntradaComprada } from "../entities/compra";
import type { EntradaSolicitada } from "../entities/entrada-solicitada";
import { validarEntradas } from "../rules/limites-compra";
import { calcularPrecioEntrada, calcularTotal } from "../rules/precios";

export interface Cotizacion {
  entradas: EntradaComprada[];
  total: number;
}

export default function cotizar(entradas: EntradaSolicitada[]): Cotizacion {
  validarEntradas(entradas);

  return {
    entradas: entradas.map(({ edad, tipoPase }) => ({
      edad,
      tipoPase,
      precio: calcularPrecioEntrada({ edad, tipoPase }),
    })),
    total: calcularTotal(entradas),
  };
}
