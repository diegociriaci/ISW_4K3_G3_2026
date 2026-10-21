import type { Compra } from "../entities/compra";

export interface CompraRepository {
  guardar(compra: Omit<Compra, "id">): Promise<Compra>;
  contarEntradasPorUsuarioYFecha(
    usuarioId: number,
    fechaVisita: string,
  ): Promise<number>;
}
