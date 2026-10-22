import { Router } from "express";
import crearCalendarioController from "./controllers/calendario.controller";
import crearCompraController from "./controllers/compra.controller";
import type CalendarioService from "./services/calendario.service";
import type { CompraService } from "./services/compra.service";

export interface Servicios {
  compraService: CompraService;
  calendarioService: CalendarioService;
}

export default function crearRutas({
  compraService,
  calendarioService,
}: Servicios): Router {
  const router = Router();
  const compraController = crearCompraController(compraService);
  const calendarioController = crearCalendarioController(calendarioService);

  router.post("/compras", compraController.comprar);
  router.post("/compras/cotizar", compraController.cotizar);
  router.post("/compras/confirmar-pago", compraController.confirmarPago);
  router.get("/calendario", calendarioController.obtener);

  return router;
}
