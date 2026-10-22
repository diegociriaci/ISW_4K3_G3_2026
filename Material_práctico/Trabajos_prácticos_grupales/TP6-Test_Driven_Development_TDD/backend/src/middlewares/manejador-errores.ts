import type { NextFunction, Request, Response } from "express";
import {
  CompraInexistenteError,
  ErrorDeNegocio,
  PagoRechazadoError,
  SolicitudInvalidaError,
  UsuarioNoRegistradoError,
} from "../errors/errores-negocio";

const STATUS_POR_ERROR = new Map<unknown, number>([
  [SolicitudInvalidaError, 400],
  [UsuarioNoRegistradoError, 401],
  [PagoRechazadoError, 402],
  [CompraInexistenteError, 404],
]);

// Cualquier otra regla de negocio incumplida responde 422
const STATUS_REGLA_INCUMPLIDA = 422;

function esJsonMalFormado(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "entity.parse.failed"
  );
}

export default function manejadorErrores(
  error: unknown,
  _req: Request,
  res: Response,
  // Express identifica a los middlewares de error por tener 4 parámetros
  _next: NextFunction,
): void {
  if (error instanceof ErrorDeNegocio) {
    res
      .status(
        STATUS_POR_ERROR.get(error.constructor) ?? STATUS_REGLA_INCUMPLIDA,
      )
      .json({ error: { tipo: error.name, mensaje: error.message } });
    return;
  }

  if (esJsonMalFormado(error)) {
    res.status(400).json({
      error: {
        tipo: "SolicitudInvalidaError",
        mensaje: "El body no es un JSON válido",
      },
    });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(error);
  res.status(500).json({
    error: { tipo: "ErrorInterno", mensaje: "Ocurrió un error inesperado" },
  });
}
