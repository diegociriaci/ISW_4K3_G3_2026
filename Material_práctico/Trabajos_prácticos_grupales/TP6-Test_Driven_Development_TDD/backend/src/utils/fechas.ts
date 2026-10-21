// Utilidades para fechas en formato "YYYY-MM-DD", tratadas en UTC para
// evitar corrimientos por zona horaria.

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function aFechaUTC(fecha: string): Date {
  return new Date(`${fecha}T00:00:00Z`);
}

function aTexto(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

export function esFechaValida(fecha: string): boolean {
  if (!FORMATO_FECHA.test(fecha)) {
    return false;
  }

  const fechaUTC = aFechaUTC(fecha);
  // Descarta fechas inexistentes como 2026-02-30, que Date corre al mes siguiente
  return !Number.isNaN(fechaUTC.getTime()) && aTexto(fechaUTC) === fecha;
}

export function diaDeLaSemana(fecha: string): number {
  return aFechaUTC(fecha).getUTCDay();
}

export function mesYDia(fecha: string): string {
  return fecha.slice(5);
}

// Mismo día del mes siguiente; si no existe, el último día de ese mes.
export function mismoDiaDelMesSiguiente(fecha: string): string {
  const [anio = 0, mes = 0, dia = 0] = fecha.split("-").map(Number);
  const ultimoDiaMesSiguiente = new Date(
    Date.UTC(anio, mes + 1, 0),
  ).getUTCDate();

  return aTexto(
    new Date(Date.UTC(anio, mes, Math.min(dia, ultimoDiaMesSiguiente))),
  );
}

// "YYYY-MM-DD" → "DD/MM/YYYY"
export function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

export function sumarDias(fecha: string, dias: number): string {
  const resultado = aFechaUTC(fecha);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return aTexto(resultado);
}
