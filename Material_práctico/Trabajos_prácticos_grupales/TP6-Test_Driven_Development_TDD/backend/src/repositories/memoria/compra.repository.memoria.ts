import type { Compra } from "../../entities/compra";
import type { CompraRepository } from "../compra.repository";

export default class CompraRepositoryEnMemoria implements CompraRepository {
  private readonly compras: Compra[] = [];

  async guardar(datos: Omit<Compra, "id">): Promise<Compra> {
    const compra: Compra = { ...datos, id: this.compras.length + 1 };
    this.compras.push(compra);
    return structuredClone(compra);
  }

  async contarEntradasPorUsuarioYFecha(
    usuarioId: number,
    fechaVisita: string,
  ): Promise<number> {
    return this.compras
      .filter((c) => c.usuarioId === usuarioId && c.fechaVisita === fechaVisita)
      .reduce((total, c) => total + c.entradas.length, 0);
  }
}
