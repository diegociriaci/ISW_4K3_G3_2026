import type { Compra } from "../entities/compra";

export interface CompraRepository {
  guardar(compra: Omit<Compra, "id">): Promise<Compra>;
  contarEntradasPorUsuarioYFecha(
    usuarioId: number,
    fechaVisita: string,
  ): Promise<number>;
  buscarPorReferenciaPago(referencia: string): Promise<Compra | null>;
  // Devuelve true sólo si la compra estaba pendiente de pago
  confirmarPago(compraId: number): Promise<boolean>;
}
