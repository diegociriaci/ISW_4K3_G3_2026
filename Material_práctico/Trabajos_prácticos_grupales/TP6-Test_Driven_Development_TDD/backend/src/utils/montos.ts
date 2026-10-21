// 10000 → "$10.000"
export default function formatearMonto(monto: number): string {
  return `$${monto.toLocaleString("es-AR")}`;
}
