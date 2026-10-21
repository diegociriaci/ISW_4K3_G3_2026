import type { ResultadoCompra } from "../types";

// Estado que viaja entre pantallas con la compra recién realizada
export interface EstadoCompra {
  resultado: ResultadoCompra;
}

export function obtenerResultado(estado: unknown): ResultadoCompra | null {
  if (typeof estado === "object" && estado !== null && "resultado" in estado) {
    return (estado as EstadoCompra).resultado;
  }
  return null;
}
