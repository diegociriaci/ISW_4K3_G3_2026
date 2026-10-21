import type { EntradaSolicitada } from "../entities/entrada-solicitada";
import { TipoPase } from "../entities/tipo-pase";

const PRECIOS_BASE: Record<TipoPase, number> = {
  [TipoPase.COMUN]: 10000,
  [TipoPase.VIP]: 20000,
};

interface ReglaDescuento {
  aplica: (edad: number) => boolean;
  factor: number;
}

// El orden importa: se aplica la primera regla que coincide con la edad.
const REGLAS_DESCUENTO: ReglaDescuento[] = [
  { aplica: (edad) => edad <= 3, factor: 0 },
  { aplica: (edad) => edad <= 15, factor: 0.5 },
  { aplica: (edad) => edad >= 60, factor: 0.5 },
];

const SIN_DESCUENTO = 1;

function factorPorEdad(edad: number): number {
  const regla = REGLAS_DESCUENTO.find((r) => r.aplica(edad));
  return regla ? regla.factor : SIN_DESCUENTO;
}

export function calcularPrecioEntrada(entrada: EntradaSolicitada): number {
  return PRECIOS_BASE[entrada.tipoPase] * factorPorEdad(entrada.edad);
}

export function calcularTotal(entradas: EntradaSolicitada[]): number {
  return entradas.reduce(
    (total, entrada) => total + calcularPrecioEntrada(entrada),
    0,
  );
}
