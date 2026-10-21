const DIAS_SEMANA = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

// "YYYY-MM-DD" → "DD/MM/YYYY"
export function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

export function nombreDelDia(fecha: string): string {
  return DIAS_SEMANA[new Date(`${fecha}T00:00:00Z`).getUTCDay()] ?? "";
}

// 30000 → "$30.000"
export function formatearMonto(monto: number): string {
  return `$${monto.toLocaleString("es-AR")}`;
}
