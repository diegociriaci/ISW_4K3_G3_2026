import type { Mail, Notificador } from "./notificador";

// Simula el envío de mails (FAQ 5): los guarda y opcionalmente los muestra
// por consola.
export default class NotificadorMailSimulado implements Notificador {
  readonly enviados: Mail[] = [];

  constructor(private readonly mostrarEnConsola = false) {}

  async enviar(mail: Mail): Promise<void> {
    this.enviados.push(mail);

    if (this.mostrarEnConsola) {
      // eslint-disable-next-line no-console -- la consola es el "envío" simulado
      console.info(
        `[Mail simulado] Para: ${mail.destinatario}\nAsunto: ${mail.asunto}\n\n${mail.cuerpo}\n`,
      );
    }
  }
}
