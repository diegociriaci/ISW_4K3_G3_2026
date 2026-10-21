export const FormaPago = {
  EFECTIVO: "EFECTIVO",
  TARJETA: "TARJETA",
} as const;

export type FormaPago = (typeof FormaPago)[keyof typeof FormaPago];

const FORMAS_DE_PAGO: unknown[] = Object.values(FormaPago);

export function esFormaPago(valor: unknown): valor is FormaPago {
  return FORMAS_DE_PAGO.includes(valor);
}
