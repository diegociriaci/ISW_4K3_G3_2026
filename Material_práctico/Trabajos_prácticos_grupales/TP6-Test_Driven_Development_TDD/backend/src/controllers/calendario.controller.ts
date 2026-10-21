import type { Request, Response } from "express";
import type CalendarioService from "../services/calendario.service";

export default function crearCalendarioController(
  calendarioService: CalendarioService,
) {
  return {
    obtener(_req: Request, res: Response): void {
      res.json(calendarioService.obtenerCalendario());
    },
  };
}
