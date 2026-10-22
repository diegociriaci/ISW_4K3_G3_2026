import { randomUUID } from "node:crypto";
import type { Reloj } from "../config/reloj";
import type { Compra } from "../entities/compra";
import type { EntradaSolicitada } from "../entities/entrada-solicitada";
import { FormaPago, esFormaPago } from "../entities/forma-pago";
import type { Usuario } from "../entities/usuario";
import {
  CompraInexistenteError,
  FormaPagoInvalidaError,
  PagoRechazadoError,
  UsuarioNoRegistradoError,
} from "../errors/errores-negocio";
import type { Notificador } from "../integrations/notificador";
import type {
  PasarelaPago,
  ResultadoPago,
} from "../integrations/pasarela-pago";
import type { CompraRepository } from "../repositories/compra.repository";
import type { UsuarioRepository } from "../repositories/usuario.repository";
import { validarFechaVisita } from "../rules/calendario-parque";
import { validarLimiteAcumulado } from "../rules/limites-compra";
import { formatearFecha } from "../utils/fechas";
import cotizar from "./cotizacion.service";
import {
  construirMailConfirmacion,
  construirMensajeConfirmacion,
} from "./resumen-compra";

export interface SolicitudCompra {
  usuarioId: number;
  email?: string;
  fechaVisita: string;
  formaPago?: FormaPago;
  entradas: EntradaSolicitada[];
}

export interface ResultadoCompra {
  compraId: number;
  cantidadEntradas: number;
  fechaVisita: string;
  total: number;
  urlRedireccion: string | null;
  emailConfirmacion: string;
  mensaje: string;
}

export interface ConfirmacionPago {
  usuarioId: number;
  pagoId: string;
}

export interface DependenciasCompraService {
  compraRepository: CompraRepository;
  usuarioRepository: UsuarioRepository;
  pasarelaPago: PasarelaPago;
  notificador: Notificador;
  reloj: Reloj;
}

/**
 * Caso de uso "Comprar entradas".
 * Orden: validar → cobrar (si es con tarjeta) → registrar → notificar.
 * Si algo falla antes de registrar, no se cobra ni se envía mail.
 * Con Checkout Pro el pago se hace fuera de la app: la compra queda pendiente
 * de pago y se notifica al confirmarlo (confirmarPago).
 */
export class CompraService {
  constructor(private readonly dependencias: DependenciasCompraService) {}

  async comprar(solicitud: SolicitudCompra): Promise<ResultadoCompra> {
    const { compraRepository, notificador } = this.dependencias;
    const { usuarioId, fechaVisita, entradas } = solicitud;

    const usuarioRegistrado = await this.buscarUsuarioRegistrado(usuarioId);
    const usuario = {
      ...usuarioRegistrado,
      email: solicitud.email ?? usuarioRegistrado.email,
    };
    const formaPago = CompraService.validarFormaPago(solicitud.formaPago);
    // Valida cantidad, edades y tipos de pase, y calcula los precios
    const cotizacion = cotizar(entradas);
    await this.validarFechaYLimiteAcumulado(solicitud);

    const pago = await this.cobrar(
      formaPago,
      cotizacion.total,
      usuario,
      solicitud,
    );

    const compra = await compraRepository.guardar({
      usuarioId,
      fechaVisita,
      formaPago,
      entradas: cotizacion.entradas,
      total: cotizacion.total,
      ...(pago?.confirmacionPendiente && {
        referenciaPago: pago.referencia,
        pendienteDePago: true,
      }),
    });

    // Con Checkout Pro el mail se envía recién cuando se confirma el pago
    if (!compra.pendienteDePago) {
      await notificador.enviar(construirMailConfirmacion(compra, usuario));
    }

    return CompraService.resultado(
      compra,
      usuario,
      pago?.urlRedireccion ?? null,
    );
  }

  /**
   * Confirma una compra pagada fuera de la app (Mercado Pago Checkout Pro).
   * Se consulta el pago a la pasarela y, si está aprobado, corresponde a una
   * compra del usuario y cubre su total, se confirma la compra y se envía el
   * mail. Confirmar de nuevo el mismo pago no reenvía el mail.
   */
  async confirmarPago({
    usuarioId,
    pagoId,
  }: ConfirmacionPago): Promise<ResultadoCompra> {
    const { compraRepository, pasarelaPago, notificador } = this.dependencias;

    if (!pasarelaPago.consultarPago) {
      throw new CompraInexistenteError("No hay pagos pendientes de confirmar");
    }
    const pago = await pasarelaPago.consultarPago(pagoId);
    const compra =
      pago && (await compraRepository.buscarPorReferenciaPago(pago.referencia));
    if (!pago || !compra || compra.usuarioId !== usuarioId) {
      throw new CompraInexistenteError(
        "No se encontró la compra correspondiente al pago",
      );
    }
    if (!pago.aprobado) {
      throw new PagoRechazadoError("El pago con tarjeta no fue aprobado");
    }
    if (pago.monto !== compra.total) {
      throw new PagoRechazadoError(
        "El monto pagado no coincide con el total de la compra",
      );
    }

    const usuario = await this.buscarUsuarioRegistrado(usuarioId);
    if (await compraRepository.confirmarPago(compra.id)) {
      await notificador.enviar(construirMailConfirmacion(compra, usuario));
    }
    return CompraService.resultado(compra, usuario, null);
  }

  private static resultado(
    compra: Compra,
    usuario: Usuario,
    urlRedireccion: string | null,
  ): ResultadoCompra {
    return {
      compraId: compra.id,
      cantidadEntradas: compra.entradas.length,
      fechaVisita: compra.fechaVisita,
      total: compra.total,
      urlRedireccion,
      emailConfirmacion: usuario.email,
      mensaje: construirMensajeConfirmacion(compra),
    };
  }

  private async buscarUsuarioRegistrado(usuarioId: number): Promise<Usuario> {
    const usuario =
      await this.dependencias.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) {
      throw new UsuarioNoRegistradoError(
        "Sólo los usuarios registrados pueden comprar entradas",
      );
    }
    return usuario;
  }

  private static validarFormaPago(formaPago: unknown): FormaPago {
    if (!esFormaPago(formaPago)) {
      throw new FormaPagoInvalidaError(
        "Debe seleccionar una forma de pago: efectivo o tarjeta",
      );
    }
    return formaPago;
  }

  private async validarFechaYLimiteAcumulado({
    usuarioId,
    fechaVisita,
    entradas,
  }: SolicitudCompra): Promise<void> {
    const { compraRepository, reloj } = this.dependencias;

    validarFechaVisita(fechaVisita, reloj.ahora());
    validarLimiteAcumulado(
      await compraRepository.contarEntradasPorUsuarioYFecha(
        usuarioId,
        fechaVisita,
      ),
      entradas.length,
    );
  }

  // Cobra con Mercado Pago si es con tarjeta; null si es en efectivo
  private async cobrar(
    formaPago: FormaPago,
    total: number,
    usuario: Usuario,
    { fechaVisita, entradas }: SolicitudCompra,
  ): Promise<(ResultadoPago & { referencia: string }) | null> {
    if (formaPago !== FormaPago.TARJETA) {
      return null;
    }

    const referencia = randomUUID();
    const pago = await this.dependencias.pasarelaPago.pagar({
      monto: total,
      email: usuario.email,
      descripcion: `${entradas.length} entradas EcoHarmony Park - ${formatearFecha(fechaVisita)}`,
      referencia,
    });
    if (!pago.aprobado) {
      throw new PagoRechazadoError("El pago con tarjeta fue rechazado");
    }
    return { ...pago, referencia };
  }
}
