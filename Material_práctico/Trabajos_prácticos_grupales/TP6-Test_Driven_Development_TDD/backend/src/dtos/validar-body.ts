import type { z } from "zod";
import { SolicitudInvalidaError } from "../errors/errores-negocio";

export default function validarBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const resultado = schema.safeParse(body);

  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
      .join("; ");
    throw new SolicitudInvalidaError(`Solicitud inválida - ${detalle}`);
  }

  return resultado.data;
}
