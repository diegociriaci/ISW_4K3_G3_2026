import type Database from "better-sqlite3";
import type { Compra } from "../../entities/compra";
import type { CompraRepository } from "../compra.repository";

export default class CompraRepositorySQLite implements CompraRepository {
  constructor(private readonly db: Database.Database) {}

  async guardar(datos: Omit<Compra, "id">): Promise<Compra> {
    const guardarEnTransaccion = this.db.transaction(() => {
      const resultado = this.db
        .prepare(
          `INSERT INTO compras (usuario_id, fecha_visita, forma_pago, total)
           VALUES (?, ?, ?, ?)`,
        )
        .run(datos.usuarioId, datos.fechaVisita, datos.formaPago, datos.total);
      const compraId = Number(resultado.lastInsertRowid);
      const insertarEntrada = this.db.prepare(
        `INSERT INTO entradas (compra_id, edad, tipo_pase, precio)
         VALUES (?, ?, ?, ?)`,
      );

      datos.entradas.forEach((entrada) => {
        insertarEntrada.run(
          compraId,
          entrada.edad,
          entrada.tipoPase,
          entrada.precio,
        );
      });

      return { ...datos, id: compraId };
    });

    return guardarEnTransaccion();
  }

  async contarEntradasPorUsuarioYFecha(
    usuarioId: number,
    fechaVisita: string,
  ): Promise<number> {
    const fila = this.db
      .prepare(
        `SELECT COUNT(e.id) AS cantidad
         FROM entradas e
         INNER JOIN compras c ON c.id = e.compra_id
         WHERE c.usuario_id = ? AND c.fecha_visita = ?`,
      )
      .get(usuarioId, fechaVisita) as { cantidad: number };
    return fila.cantidad;
  }
}
