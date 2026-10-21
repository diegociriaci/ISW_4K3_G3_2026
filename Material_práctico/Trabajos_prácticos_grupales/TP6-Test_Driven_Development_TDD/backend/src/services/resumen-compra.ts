import type { Compra } from "../entities/compra";
import { FormaPago } from "../entities/forma-pago";
import { TipoPase } from "../entities/tipo-pase";
import type { Usuario } from "../entities/usuario";
import type { Mail } from "../integrations/notificador";
import { formatearFecha } from "../utils/fechas";
import formatearMonto from "../utils/montos";

const NOMBRES_PASE: Record<TipoPase, string> = {
  [TipoPase.COMUN]: "Común",
  [TipoPase.VIP]: "VIP",
};

const NOMBRES_FORMA_PAGO: Record<FormaPago, string> = {
  [FormaPago.EFECTIVO]: "Efectivo (se abona en boletería)",
  [FormaPago.TARJETA]: "Tarjeta (Mercado Pago)",
};

function escaparHtml(texto: string): string {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function construirHtml(compra: Compra, usuario: Usuario): string {
  const filas = compra.entradas
    .map(
      (entrada, indice) => `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #f2e8cf">Visitante ${indice + 1}</td>
          <td style="padding:12px;border-bottom:1px solid #f2e8cf">${entrada.edad} años</td>
          <td style="padding:12px;border-bottom:1px solid #f2e8cf">${NOMBRES_PASE[entrada.tipoPase]}</td>
          <td style="padding:12px;border-bottom:1px solid #f2e8cf;text-align:right;font-weight:700">${formatearMonto(entrada.precio)}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#f2e8cf;color:#263a2b;font-family:Lato,Arial,sans-serif">
    <div style="max-width:620px;margin:0 auto;padding:28px 14px">
      <div style="overflow:hidden;border-radius:18px;background:#ffffff;box-shadow:0 8px 24px rgba(56,102,65,.16)">
        <div style="padding:30px;background:#386641;color:#ffffff;text-align:center">
          <div style="font-size:30px">🌿</div>
          <h1 style="margin:8px 0 0;font-size:26px">EcoHarmony Park</h1>
          <p style="margin:8px 0 0;color:#f2e8cf">Confirmación de compra #${compra.id}</p>
        </div>
        <div style="padding:30px">
          <h2 style="margin:0 0 10px;color:#386641">¡Tu visita está confirmada!</h2>
          <p style="margin:0 0 24px;line-height:1.6">Hola ${escaparHtml(usuario.nombre)}, reservaste <strong>${compra.entradas.length} entradas</strong> para el <strong>${formatearFecha(compra.fechaVisita)}</strong>.</p>
          <div style="margin-bottom:24px;padding:18px;border-left:5px solid #a7c957;border-radius:10px;background:#f8f4e8">
            <div style="font-size:13px;color:#6a994e;text-transform:uppercase">Fecha de visita</div>
            <div style="margin-top:5px;font-size:21px;font-weight:700;color:#386641">${formatearFecha(compra.fechaVisita)}</div>
          </div>
          <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">
            <thead>
              <tr style="background:#6a994e;color:#ffffff;text-align:left">
                <th style="padding:12px">Entrada</th><th style="padding:12px">Edad</th><th style="padding:12px">Pase</th><th style="padding:12px;text-align:right">Subtotal</th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
          <div style="margin-top:24px;padding-top:20px;border-top:2px solid #a7c957">
            <p style="margin:0 0 8px">Forma de pago: <strong>${NOMBRES_FORMA_PAGO[compra.formaPago]}</strong></p>
            <p style="margin:0;text-align:right;font-size:24px;color:#386641">Total: <strong>${formatearMonto(compra.total)}</strong></p>
          </div>
          <p style="margin:28px 0 0;padding:14px;border-radius:10px;background:#bc4749;color:#ffffff;text-align:center">Presentá este correo al ingresar al parque.</p>
        </div>
      </div>
      <p style="margin:18px 0 0;text-align:center;font-size:12px;color:#6a994e">EcoHarmony Park · Naturaleza, aventura y diversión</p>
    </div>
  </body>
</html>`;
}

export function construirMensajeConfirmacion(compra: Compra): string {
  return `Compraste ${compra.entradas.length} entradas para el ${formatearFecha(compra.fechaVisita)}`;
}

export function construirMailConfirmacion(
  compra: Compra,
  usuario: Usuario,
): Mail {
  const detalle = compra.entradas.map(
    (entrada, indice) =>
      `Visitante ${indice + 1}: ${entrada.edad} años - Pase ${NOMBRES_PASE[entrada.tipoPase]} - ${formatearMonto(entrada.precio)}`,
  );

  return {
    destinatario: usuario.email,
    asunto: `Confirmación de compra #${compra.id} - EcoHarmony Park`,
    html: construirHtml(compra, usuario),
    cuerpo: [
      `¡Hola ${usuario.nombre}! ${construirMensajeConfirmacion(compra)}.`,
      "",
      `Cantidad de entradas: ${compra.entradas.length}`,
      `Fecha de visita: ${formatearFecha(compra.fechaVisita)}`,
      "",
      ...detalle,
      "",
      `Forma de pago: ${NOMBRES_FORMA_PAGO[compra.formaPago]}`,
      `Total: ${formatearMonto(compra.total)}`,
    ].join("\n"),
  };
}
