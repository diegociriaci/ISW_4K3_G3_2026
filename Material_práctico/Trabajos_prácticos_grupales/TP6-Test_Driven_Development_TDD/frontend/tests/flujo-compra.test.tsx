import { render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import * as api from "../src/services/api";
import type { ResultadoCompra } from "../src/types";
import redirigirFueraDeLaApp from "../src/utils/redireccion";

vi.mock("../src/services/api");
// jsdom no puede navegar a otro sitio
vi.mock("../src/utils/redireccion");

const RESULTADO_EFECTIVO: ResultadoCompra = {
  compraId: 1,
  cantidadEntradas: 2,
  fechaVisita: "2026-10-20",
  total: 30000,
  urlRedireccion: null,
  emailConfirmacion: "ana@mail.com",
  mensaje: "Compraste 2 entradas para el 20/10/2026",
};

const RESULTADO_TARJETA: ResultadoCompra = {
  ...RESULTADO_EFECTIVO,
  urlRedireccion: "http://localhost:5173/mercado-pago?monto=30000",
};

beforeEach(() => {
  vi.mocked(redirigirFueraDeLaApp).mockReset();
  vi.mocked(api.confirmarPago).mockReset();
  vi.mocked(api.obtenerCalendario).mockResolvedValue({
    desde: "2026-10-14",
    hasta: "2026-11-14",
    dias: [{ fecha: "2026-10-20", habilitado: true }],
  });
  vi.mocked(api.cotizar).mockResolvedValue({ entradas: [], total: 30000 });
});

function renderizarApp(ruta = "/") {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <App />
    </MemoryRouter>,
  );
  return user;
}

async function completarYConfirmar(user: UserEvent, formaPago: RegExp) {
  await user.click(await screen.findByRole("button", { name: /20\/10\/2026/ }));
  await user.click(screen.getByRole("button", { name: "Agregar una entrada" }));
  await user.type(screen.getByLabelText("Edad del visitante 1"), "30");
  await user.type(screen.getByLabelText("Edad del visitante 2"), "35");
  await user.selectOptions(
    screen.getByLabelText("Pase del visitante 2"),
    "VIP",
  );
  await user.click(screen.getByLabelText(formaPago));
  await user.click(screen.getByRole("button", { name: "Confirmar compra" }));
}

describe("Flujo de compra de entradas", () => {
  describe("pago en efectivo", () => {
    it("informa la cantidad de entradas y la fecha al finalizar", async () => {
      vi.mocked(api.comprar).mockResolvedValue(RESULTADO_EFECTIVO);
      const user = renderizarApp();

      await completarYConfirmar(user, /Efectivo/);

      expect(
        await screen.findByRole("heading", { name: "¡Compra confirmada!" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Compraste 2 entradas para el 20/10/2026"),
      ).toBeInTheDocument();
      expect(screen.getByText("Total: $30.000")).toBeInTheDocument();
    });

    it("muestra un modal con el mail al que se envió la confirmación", async () => {
      vi.mocked(api.comprar).mockResolvedValue(RESULTADO_EFECTIVO);
      const user = renderizarApp();

      await completarYConfirmar(user, /Efectivo/);

      const modal = await screen.findByRole("dialog");
      expect(
        within(modal).getByText("Mail enviado a ana@mail.com"),
      ).toBeInTheDocument();

      await user.click(within(modal).getByRole("button", { name: "Cerrar" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("pago con tarjeta", () => {
    it("redirige a Mercado Pago, que informa la compra exitosa", async () => {
      vi.mocked(api.comprar).mockResolvedValue(RESULTADO_TARJETA);
      const user = renderizarApp();

      await completarYConfirmar(user, /Tarjeta/);

      expect(
        await screen.findByRole("heading", { name: /Mercado Pago/ }),
      ).toBeInTheDocument();
      expect(screen.getByText("Compra exitosa")).toBeInTheDocument();
      expect(screen.getByText("$30.000")).toBeInTheDocument();
    });

    it("al volver de Mercado Pago muestra la confirmación y el mail enviado", async () => {
      vi.mocked(api.comprar).mockResolvedValue(RESULTADO_TARJETA);
      const user = renderizarApp();
      await completarYConfirmar(user, /Tarjeta/);

      await user.click(
        await screen.findByRole("button", {
          name: "Volver a EcoHarmony Park",
        }),
      );

      expect(
        await screen.findByText("Compraste 2 entradas para el 20/10/2026"),
      ).toBeInTheDocument();
      expect(
        within(screen.getByRole("dialog")).getByText(
          "Mail enviado a ana@mail.com",
        ),
      ).toBeInTheDocument();
    });

    it("la pantalla de Mercado Pago muestra el monto recibido en la URL", async () => {
      renderizarApp("/mercado-pago?monto=25000");

      expect(await screen.findByText("Compra exitosa")).toBeInTheDocument();
      expect(screen.getByText("$25.000")).toBeInTheDocument();
    });
  });

  describe("pago con tarjeta en Mercado Pago Checkout Pro", () => {
    const URL_CHECKOUT_PRO =
      "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=123";

    it("redirige a la página de pago de Mercado Pago", async () => {
      vi.mocked(api.comprar).mockResolvedValue({
        ...RESULTADO_EFECTIVO,
        urlRedireccion: URL_CHECKOUT_PRO,
      });
      const user = renderizarApp();

      await completarYConfirmar(user, /Tarjeta/);

      await vi.waitFor(() =>
        expect(redirigirFueraDeLaApp).toHaveBeenCalledWith(URL_CHECKOUT_PRO),
      );
    });

    // Así vuelve Mercado Pago a la app después de pagar
    const VUELTA_PAGO_APROBADO =
      "/confirmacion?collection_id=999&collection_status=approved&payment_id=999&status=approved&external_reference=abc";

    it("al volver con el pago aprobado, confirma el pago y muestra la confirmación y el mail enviado", async () => {
      vi.mocked(api.confirmarPago).mockResolvedValue(RESULTADO_EFECTIVO);

      renderizarApp(VUELTA_PAGO_APROBADO);

      expect(
        await screen.findByRole("heading", { name: "¡Compra confirmada!" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Compraste 2 entradas para el 20/10/2026"),
      ).toBeInTheDocument();
      expect(
        within(screen.getByRole("dialog")).getByText(
          "Mail enviado a ana@mail.com",
        ),
      ).toBeInTheDocument();
      expect(api.confirmarPago).toHaveBeenCalledTimes(1);
      expect(api.confirmarPago).toHaveBeenCalledWith("999");
    });

    it("mientras se confirma el pago lo informa", async () => {
      vi.mocked(api.confirmarPago).mockReturnValue(new Promise(() => {}));

      renderizarApp(VUELTA_PAGO_APROBADO);

      expect(
        await screen.findByText("Confirmando tu pago…"),
      ).toBeInTheDocument();
    });

    it("si el pago no se pudo confirmar, muestra el motivo y permite volver a comprar", async () => {
      vi.mocked(api.confirmarPago).mockRejectedValue(
        new Error("El pago con tarjeta no fue aprobado"),
      );
      const user = renderizarApp(VUELTA_PAGO_APROBADO);

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "El pago con tarjeta no fue aprobado",
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      await user.click(
        screen.getByRole("link", { name: "Volver a comprar entradas" }),
      );

      expect(
        await screen.findByRole("heading", { name: "Comprar entradas" }),
      ).toBeInTheDocument();
    });

    it("si se vuelve sin pagar, informa que el pago no se completó", async () => {
      renderizarApp("/confirmacion?payment_id=null&status=null");

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "El pago no se completó",
      );
      expect(api.confirmarPago).not.toHaveBeenCalled();
    });
  });

  it("muestra el error devuelto por el servidor y permanece en el formulario", async () => {
    vi.mocked(api.comprar).mockRejectedValue(
      new Error("El parque está cerrado en la fecha elegida"),
    );
    const user = renderizarApp();

    await completarYConfirmar(user, /Efectivo/);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El parque está cerrado en la fecha elegida",
    );
    expect(
      screen.getByRole("button", { name: "Confirmar compra" }),
    ).toBeInTheDocument();
  });

  it("si se entra a la confirmación sin haber comprado, vuelve al formulario", async () => {
    renderizarApp("/confirmacion");

    expect(
      await screen.findByRole("heading", { name: "Comprar entradas" }),
    ).toBeInTheDocument();
  });
});
