import type { Momento } from "../entities/momento";

export interface Reloj {
  ahora(): Momento;
}

const ZONA_HORARIA_PARQUE = "America/Argentina/Buenos_Aires";

const formateador = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_HORARIA_PARQUE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export class RelojSistema implements Reloj {
  constructor(private readonly obtenerFecha: () => Date = () => new Date()) {}

  ahora(): Momento {
    const partes = Object.fromEntries(
      formateador
        .formatToParts(this.obtenerFecha())
        .map(({ type, value }) => [type, value]),
    );

    return {
      fecha: `${partes.year}-${partes.month}-${partes.day}`,
      hora: `${partes.hour}:${partes.minute}`,
    };
  }
}
