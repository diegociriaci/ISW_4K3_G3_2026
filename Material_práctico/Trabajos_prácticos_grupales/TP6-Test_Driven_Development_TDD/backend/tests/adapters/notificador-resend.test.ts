import { beforeEach, describe, expect, it, vi } from "vitest";
import NotificadorResend from "../../src/integrations/notificador-resend";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

const REMITENTE = "EcoHarmony Park <onboarding@resend.dev>";

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue({ data: { id: "1" }, error: null });
});

describe("NotificadorResend", () => {
  it("envía el mail con remitente, destinatario, asunto, texto y HTML", async () => {
    const notificador = new NotificadorResend("re_test", REMITENTE);

    await notificador.enviar({
      destinatario: "ana@mail.com",
      asunto: "Confirmación de compra #1",
      cuerpo: "Compraste 2 entradas",
      html: "<p>Compraste 2 entradas</p>",
    });

    expect(send).toHaveBeenCalledWith({
      from: REMITENTE,
      to: "ana@mail.com",
      subject: "Confirmación de compra #1",
      text: "Compraste 2 entradas",
      html: "<p>Compraste 2 entradas</p>",
    });
  });

  it("si el mail no trae HTML, arma uno con el texto escapado", async () => {
    const notificador = new NotificadorResend("re_test", REMITENTE);

    await notificador.enviar({
      destinatario: "ana@mail.com",
      asunto: "Confirmación",
      cuerpo: "Total <$30.000> & \"VIP\" 'Común'",
    });

    const { html } = send.mock.calls[0]?.[0] as { html: string };
    expect(html).toContain(
      "Total &lt;$30.000&gt; &amp; &quot;VIP&quot; &#039;Común&#039;",
    );
  });

  it("si Resend devuelve un error, lo informa", async () => {
    send.mockResolvedValue({
      data: null,
      error: { message: "API key inválida" },
    });
    const notificador = new NotificadorResend("re_test", REMITENTE);

    await expect(
      notificador.enviar({
        destinatario: "ana@mail.com",
        asunto: "Confirmación",
        cuerpo: "Hola",
      }),
    ).rejects.toThrow("API key inválida");
  });
});
