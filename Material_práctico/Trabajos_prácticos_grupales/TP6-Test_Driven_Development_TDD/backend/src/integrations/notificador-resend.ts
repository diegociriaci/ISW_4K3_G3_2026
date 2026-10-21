import { Resend } from "resend";
import type { Mail, Notificador } from "./notificador";

export default class NotificadorResend implements Notificador {
  private readonly cliente: Resend;

  constructor(
    apiKey: string,
    private readonly remitente: string,
  ) {
    this.cliente = new Resend(apiKey);
  }

  async enviar(mail: Mail): Promise<void> {
    const { error } = await this.cliente.emails.send({
      from: this.remitente,
      to: mail.destinatario,
      subject: mail.asunto,
      text: mail.cuerpo,
      html:
        mail.html ??
        `<div style="font-family: Arial, sans-serif; white-space: pre-line">${NotificadorResend.escaparHtml(mail.cuerpo)}</div>`,
    });

    if (error) {
      throw new Error(
        `No se pudo enviar el mail de confirmacion: ${error.message}`,
      );
    }
  }

  private static escaparHtml(texto: string): string {
    return texto
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}
