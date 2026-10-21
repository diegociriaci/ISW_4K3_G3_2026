import type { Reloj } from "../config/reloj";
import type { Momento } from "../entities/momento";
import { ErrorDeNegocio } from "../errors/errores-negocio";
import { validarFechaVisita } from "../rules/calendario-parque";
import { mismoDiaDelMesSiguiente, sumarDias } from "../utils/fechas";

export interface DiaCalendario {
  fecha: string;
  habilitado: boolean;
  motivo?: string;
}

export interface Calendario {
  desde: string;
  hasta: string;
  dias: DiaCalendario[];
}

function evaluarDia(fecha: string, ahora: Momento): DiaCalendario {
  try {
    validarFechaVisita(fecha, ahora);
    return { fecha, habilitado: true };
  } catch (error) {
    if (error instanceof ErrorDeNegocio) {
      return { fecha, habilitado: false, motivo: error.message };
    }
    throw error;
  }
}

// Días que se pueden elegir en el calendario (FAQ 2): desde hoy hasta
// 1 mes después, indicando cuáles están deshabilitados y por qué.
export default class CalendarioService {
  constructor(private readonly reloj: Reloj) {}

  obtenerCalendario(): Calendario {
    const ahora = this.reloj.ahora();
    const desde = ahora.fecha;
    const hasta = mismoDiaDelMesSiguiente(desde);

    const dias: DiaCalendario[] = [];
    for (let fecha = desde; fecha <= hasta; fecha = sumarDias(fecha, 1)) {
      dias.push(evaluarDia(fecha, ahora));
    }

    return { desde, hasta, dias };
  }
}
