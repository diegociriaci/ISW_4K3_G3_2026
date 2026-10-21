import type { Reloj } from "../config/reloj";
import type { EntradaSolicitada } from "../entities/entrada-solicitada";
import { FormaPago, esFormaPago } from "../entities/forma-pago";
import type { Usuario } from "../entities/usuario";
import {
  FormaPagoInvalidaError,
  PagoRechazadoError,
  UsuarioNoRegistradoError,
} from "../errors/errores-negocio";
import type { Notificador } from "../integrations/notificador";
import type { PasarelaPago } from "../integrations/pasarela-pago";
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

    const urlRedireccion = await this.cobrar(
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
    });

    await notificador.enviar(construirMailConfirmacion(compra, usuario));

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

  // Devuelve la URL de Mercado Pago a la que se redirige, o null si es efectivo
  private async cobrar(
    formaPago: FormaPago,
    total: number,
    usuario: Usuario,
    { fechaVisita, entradas }: SolicitudCompra,
  ): Promise<string | null> {
    if (formaPago !== FormaPago.TARJETA) {
      return null;
    }

    const pago = await this.dependencias.pasarelaPago.pagar({
      monto: total,
      email: usuario.email,
      descripcion: `${entradas.length} entradas EcoHarmony Park - ${formatearFecha(fechaVisita)}`,
    });
    if (!pago.aprobado) {
      throw new PagoRechazadoError("El pago con tarjeta fue rechazado");
    }
    return pago.urlRedireccion;
  }
}
