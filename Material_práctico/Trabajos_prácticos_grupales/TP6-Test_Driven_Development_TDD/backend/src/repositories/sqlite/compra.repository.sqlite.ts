import type Database from "better-sqlite3";
import type { Compra, EntradaComprada } from "../../entities/compra";
import type { FormaPago } from "../../entities/forma-pago";
import type { CompraRepository } from "../compra.repository";

export default class CompraRepositorySQLite implements CompraRepository {
  constructor(private readonly db: Database.Database) {}

  async guardar(datos: Omit<Compra, "id">): Promise<Compra> {
    const guardarEnTransaccion = this.db.transaction(() => {
      const resultado = this.db
        .prepare(
          `INSERT INTO compras (usuario_id, fecha_visita, forma_pago, total,
             referencia_pago, pendiente_pago)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          datos.usuarioId,
          datos.fechaVisita,
          datos.formaPago,
          datos.total,
          datos.referenciaPago ?? null,
          datos.pendienteDePago ? 1 : 0,
        );
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

  async buscarPorReferenciaPago(referencia: string): Promise<Compra | null> {
    const fila = this.db
      .prepare(
        `SELECT id, usuario_id, fecha_visita, forma_pago, total,
                referencia_pago, pendiente_pago
         FROM compras WHERE referencia_pago = ?`,
      )
      .get(referencia) as FilaCompra | undefined;
    if (!fila) {
      return null;
    }

    const entradas = this.db
      .prepare(
        `SELECT edad, tipo_pase AS tipoPase, precio
         FROM entradas WHERE compra_id = ? ORDER BY id`,
      )
      .all(fila.id) as EntradaComprada[];

    return {
      id: fila.id,
      usuarioId: fila.usuario_id,
      fechaVisita: fila.fecha_visita,
      formaPago: fila.forma_pago,
      entradas,
      total: fila.total,
      referenciaPago: fila.referencia_pago,
      pendienteDePago: fila.pendiente_pago === 1,
    };
  }

  async confirmarPago(compraId: number): Promise<boolean> {
    // Sólo cambia si estaba pendiente: confirmar dos veces devuelve false
    const resultado = this.db
      .prepare(
        `UPDATE compras SET pendiente_pago = 0
         WHERE id = ? AND pendiente_pago = 1`,
      )
      .run(compraId);
    return resultado.changes === 1;
  }
}

interface FilaCompra {
  id: number;
  usuario_id: number;
  fecha_visita: string;
  forma_pago: FormaPago;
  total: number;
  referencia_pago: string;
  pendiente_pago: number;
}
