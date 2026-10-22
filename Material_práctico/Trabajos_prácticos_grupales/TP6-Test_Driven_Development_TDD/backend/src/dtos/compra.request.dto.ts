import { z } from "zod";

// Sólo se valida la forma del body. Las reglas de negocio (tipos de pase,
// rango de edad, forma de pago, fechas) se validan en rules/ y services/.
const entradaSchema = z.object({
  edad: z.number(),
  tipoPase: z.string(),
});

export const compraRequestSchema = z.object({
  fechaVisita: z.string(),
  formaPago: z.string().optional(),
  email: z.string().email().optional(),
  entradas: z.array(entradaSchema),
});

export const cotizacionRequestSchema = z.object({
  entradas: z.array(entradaSchema),
});

// Id del pago que Mercado Pago agrega a la URL al volver a la app
export const confirmarPagoRequestSchema = z.object({
  pagoId: z.string().min(1),
});

export type CompraRequestDto = z.infer<typeof compraRequestSchema>;
export type CotizacionRequestDto = z.infer<typeof cotizacionRequestSchema>;
