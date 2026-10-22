import type { Request, Response } from "express";
import type { EntradaSolicitada } from "../entities/entrada-solicitada";
import type { FormaPago } from "../entities/forma-pago";
import { UsuarioNoRegistradoError } from "../errors/errores-negocio";
import {
  compraRequestSchema,
  confirmarPagoRequestSchema,
  cotizacionRequestSchema,
} from "../dtos/compra.request.dto";
import validarBody from "../dtos/validar-body";
import type { CompraService } from "../services/compra.service";
import cotizar from "../services/cotizacion.service";

// Sesión simulada (FAQ 19): el id del usuario logueado llega en un header.
function obtenerUsuarioId(req: Request): number {
  const usuarioId = Number(req.header("x-usuario-id"));

  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    throw new UsuarioNoRegistradoError(
      "Debe iniciar sesión para comprar entradas",
    );
  }
  return usuarioId;
}

export default function crearCompraController(compraService: CompraService) {
  return {
    async comprar(req: Request, res: Response): Promise<void> {
      const usuarioId = obtenerUsuarioId(req);
      const body = validarBody(compraRequestSchema, req.body);

      // El tipo de pase y la forma de pago se validan en rules/ y services/
      const resultado = await compraService.comprar({
        usuarioId,
        email: body.email,
        fechaVisita: body.fechaVisita,
        formaPago: body.formaPago as FormaPago | undefined,
        entradas: body.entradas as EntradaSolicitada[],
      });

      res.status(201).json(resultado);
    },

    // Al volver de Mercado Pago Checkout Pro
    async confirmarPago(req: Request, res: Response): Promise<void> {
      const usuarioId = obtenerUsuarioId(req);
      const { pagoId } = validarBody(confirmarPagoRequestSchema, req.body);

      res.json(await compraService.confirmarPago({ usuarioId, pagoId }));
    },

    cotizar(req: Request, res: Response): void {
      const body = validarBody(cotizacionRequestSchema, req.body);

      res.json(cotizar(body.entradas as EntradaSolicitada[]));
    },
  };
}
