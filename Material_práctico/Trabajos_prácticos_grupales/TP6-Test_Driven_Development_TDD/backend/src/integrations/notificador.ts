export interface Mail {
  destinatario: string;
  asunto: string;
  cuerpo: string;
  html?: string;
}

export interface Notificador {
  enviar(mail: Mail): Promise<void>;
}
