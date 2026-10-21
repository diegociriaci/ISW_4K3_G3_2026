export const TipoPase = {
  COMUN: "COMUN",
  VIP: "VIP",
} as const;

export type TipoPase = (typeof TipoPase)[keyof typeof TipoPase];
