import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ComprarEntradas from "../src/pages/ComprarEntradas";
import * as api from "../src/services/api";
import type { Calendario, EntradaSolicitada } from "../src/types";

vi.mock("../src/services/api");

const CALENDARIO: Calendario = {
  desde: "2026-10-14",
  hasta: "2026-11-14",
  dias: [
    {
      fecha: "2026-10-14",
      habilitado: false,
      motivo: "Para el día de hoy sólo se puede comprar hasta las 17:30",
    },
    { fecha: "2026-10-15", habilitado: true },
    {
      fecha: "2026-10-19",
      habilitado: false,
      motivo: "El parque está cerrado en la fecha elegida",
    },
    { fecha: "2026-10-20", habilitado: true },
  ],
};

const PRECIO_ADULTO = { COMUN: 10000, VIP: 20000 };

beforeEach(() => {
  vi.mocked(api.obtenerCalendario).mockResolvedValue(CALENDARIO);
  vi.mocked(api.cotizar).mockImplementation(
    async (entradas: EntradaSolicitada[]) => {
      const conPrecio = entradas.map((e) => ({
        ...e,
        precio: PRECIO_ADULTO[e.tipoPase],
      }));
      return {
        entradas: conPrecio,
        total: conPrecio.reduce((suma, e) => suma + e.precio, 0),
      };
    },
  );
});

function renderizar() {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <ComprarEntradas />
    </MemoryRouter>,
  );
  return user;
}

const botonDia = (fecha: RegExp) =>
  screen.findByRole("button", { name: fecha });
const botonConfirmar = () =>
  screen.getByRole("button", { name: "Confirmar compra" });
const botonAgregar = () =>
  screen.getByRole("button", { name: "Agregar una entrada" });
const botonQuitar = () =>
  screen.getByRole("button", { name: "Quitar una entrada" });

async function completarVisitante(
  user: UserEvent,
  numero: number,
  edad: string,
  pase: "Común" | "VIP" = "Común",
) {
  await user.type(screen.getByLabelText(`Edad del visitante ${numero}`), edad);
  await user.selectOptions(
    screen.getByLabelText(`Pase del visitante ${numero}`),
    pase,
  );
}

describe("Formulario de compra de entradas", () => {
  describe("calendario de fecha de visita", () => {
    it("deshabilita los días en que no se puede comprar y habilita el resto", async () => {
      renderizar();

      expect(await botonDia(/20\/10\/2026/)).toBeEnabled();
      expect(await botonDia(/15\/10\/2026/)).toBeEnabled();
      expect(await botonDia(/19\/10\/2026/)).toBeDisabled();
      expect(await botonDia(/14\/10\/2026/)).toBeDisabled();
    });

    it("muestra el motivo por el que un día está deshabilitado", async () => {
      renderizar();

      expect(await botonDia(/19\/10\/2026/)).toHaveAttribute(
        "title",
        "El parque está cerrado en la fecha elegida",
      );
    });

    it("permite seleccionar un día habilitado", async () => {
      const user = renderizar();

      await user.click(await botonDia(/20\/10\/2026/));

      expect(await botonDia(/20\/10\/2026/)).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });
  });

  describe("cantidad de entradas (1 a 10)", () => {
    it("empieza en 1 entrada y no permite bajar de 1", async () => {
      renderizar();
      await botonDia(/20\/10\/2026/);

      expect(screen.getByLabelText("Cantidad de entradas")).toHaveTextContent(
        "1",
      );
      expect(botonQuitar()).toBeDisabled();
    });

    it("no permite superar las 10 entradas", async () => {
      const user = renderizar();
      await botonDia(/20\/10\/2026/);

      for (let i = 1; i < 10; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await user.click(botonAgregar());
      }

      expect(screen.getByLabelText("Cantidad de entradas")).toHaveTextContent(
        "10",
      );
      expect(botonAgregar()).toBeDisabled();
    });

    it("muestra un formulario de edad y tipo de pase por cada entrada", async () => {
      const user = renderizar();
      await botonDia(/20\/10\/2026/);

      await user.click(botonAgregar());
      await user.click(botonAgregar());

      expect(screen.getAllByLabelText(/Edad del visitante/)).toHaveLength(3);
      expect(screen.getAllByLabelText(/Pase del visitante/)).toHaveLength(3);

      await user.click(botonQuitar());

      expect(screen.getAllByLabelText(/Edad del visitante/)).toHaveLength(2);
    });
  });

  describe("edad del visitante", () => {
    it("no permite ingresar una edad negativa", async () => {
      const user = renderizar();
      await botonDia(/20\/10\/2026/);

      await user.type(screen.getByLabelText("Edad del visitante 1"), "-5");

      expect(screen.getByLabelText("Edad del visitante 1")).toHaveValue(5);
    });

    it("no permite pegar una edad negativa", async () => {
      const user = renderizar();
      await botonDia(/20\/10\/2026/);

      await user.click(screen.getByLabelText("Edad del visitante 1"));
      await user.paste("-5");

      expect(screen.getByLabelText("Edad del visitante 1")).toHaveValue(null);
    });

    it("descarta los ceros a la izquierda", async () => {
      renderizar();
      await botonDia(/20\/10\/2026/);
      const edad = screen.getByLabelText<HTMLInputElement>(
        "Edad del visitante 1",
      );

      // fireEvent y no user.type: user-event ya quita los ceros en inputs
      // numéricos, mientras que el navegador sí deja escribir "023"
      fireEvent.change(edad, { target: { value: "023" } });

      expect(edad.value).toBe("23");
    });

    it("avisa cuál es la edad máxima si se ingresa una mayor", async () => {
      const user = renderizar();
      await user.click(await botonDia(/20\/10\/2026/));

      await completarVisitante(user, 1, "121");
      await user.click(screen.getByLabelText(/Efectivo/));

      const edad = screen.getByLabelText("Edad del visitante 1");
      expect(edad).toHaveAccessibleDescription("La edad máxima es 120 años");
      expect(edad).toBeInvalid();
      expect(botonConfirmar()).toBeDisabled();
    });

    it("no muestra el aviso con una edad dentro del máximo", async () => {
      const user = renderizar();
      await botonDia(/20\/10\/2026/);

      await completarVisitante(user, 1, "120");

      expect(screen.queryByText(/edad máxima/)).not.toBeInTheDocument();
      expect(screen.getByLabelText("Edad del visitante 1")).toBeValid();
    });

    it("permite una edad de 0 (bebés)", async () => {
      const user = renderizar();
      await botonDia(/20\/10\/2026/);
      const edad = screen.getByLabelText<HTMLInputElement>(
        "Edad del visitante 1",
      );

      await user.type(edad, "0");

      expect(edad.value).toBe("0");
    });
  });

  describe("botón Confirmar compra", () => {
    it("está deshabilitado sin forma de pago aunque el resto esté completo", async () => {
      const user = renderizar();
      await user.click(await botonDia(/20\/10\/2026/));
      await completarVisitante(user, 1, "30");

      expect(botonConfirmar()).toBeDisabled();

      await user.click(screen.getByLabelText(/Efectivo/));

      expect(botonConfirmar()).toBeEnabled();
    });

    it("está deshabilitado sin fecha de visita", async () => {
      const user = renderizar();
      await botonDia(/20\/10\/2026/);
      await completarVisitante(user, 1, "30");
      await user.click(screen.getByLabelText(/Efectivo/));

      expect(botonConfirmar()).toBeDisabled();
    });

    it("está deshabilitado si falta la edad de algún visitante", async () => {
      const user = renderizar();
      await user.click(await botonDia(/20\/10\/2026/));
      await user.click(botonAgregar());
      await completarVisitante(user, 1, "30");
      await user.click(screen.getByLabelText(/Tarjeta/));

      expect(botonConfirmar()).toBeDisabled();
    });
  });

  it("muestra el total cotizado por el servidor", async () => {
    const user = renderizar();
    await botonDia(/20\/10\/2026/);
    await user.click(botonAgregar());

    await completarVisitante(user, 1, "30", "Común");
    await completarVisitante(user, 2, "35", "VIP");

    expect(await screen.findByText("Total: $30.000")).toBeInTheDocument();
    expect(api.cotizar).toHaveBeenLastCalledWith([
      { edad: 30, tipoPase: "COMUN" },
      { edad: 35, tipoPase: "VIP" },
    ]);
  });

  describe("precio individual de cada entrada", () => {
    it("muestra en cada visitante el precio cotizado por el servidor", async () => {
      const user = renderizar();
      await botonDia(/20\/10\/2026/);
      await user.click(botonAgregar());

      await completarVisitante(user, 1, "30", "Común");
      await completarVisitante(user, 2, "35", "VIP");

      const visitante1 = screen.getByRole("group", { name: "Visitante 1" });
      const visitante2 = screen.getByRole("group", { name: "Visitante 2" });
      expect(
        await within(visitante1).findByText("Precio: $10.000"),
      ).toBeInTheDocument();
      expect(
        await within(visitante2).findByText("Precio: $20.000"),
      ).toBeInTheDocument();
    });

    it("muestra el precio de un visitante apenas se completa su edad, aunque falten otros", async () => {
      const user = renderizar();
      await botonDia(/20\/10\/2026/);
      await user.click(botonAgregar());

      await completarVisitante(user, 1, "30", "Común");

      const visitante1 = screen.getByRole("group", { name: "Visitante 1" });
      const visitante2 = screen.getByRole("group", { name: "Visitante 2" });
      expect(
        await within(visitante1).findByText("Precio: $10.000"),
      ).toBeInTheDocument();
      expect(within(visitante2).queryByText(/Precio:/)).not.toBeInTheDocument();
      expect(screen.getByText("Total: $10.000")).toBeInTheDocument();
      expect(api.cotizar).toHaveBeenLastCalledWith([
        { edad: 30, tipoPase: "COMUN" },
      ]);
    });

    it("al agregar una entrada mantiene los precios anteriores y actualiza el total al completarla", async () => {
      const user = renderizar();
      await botonDia(/20\/10\/2026/);
      await completarVisitante(user, 1, "30", "Común");
      expect(await screen.findByText("Total: $10.000")).toBeInTheDocument();

      await user.click(botonAgregar());

      const visitante1 = screen.getByRole("group", { name: "Visitante 1" });
      expect(
        within(visitante1).getByText("Precio: $10.000"),
      ).toBeInTheDocument();
      expect(screen.getByText("Total: $10.000")).toBeInTheDocument();

      await completarVisitante(user, 2, "35", "VIP");

      const visitante2 = screen.getByRole("group", { name: "Visitante 2" });
      expect(
        await within(visitante2).findByText("Precio: $20.000"),
      ).toBeInTheDocument();
      expect(await screen.findByText("Total: $30.000")).toBeInTheDocument();
    });

    it("al quitar una entrada el total se actualiza", async () => {
      const user = renderizar();
      await botonDia(/20\/10\/2026/);
      await user.click(botonAgregar());
      await completarVisitante(user, 1, "30", "Común");
      await completarVisitante(user, 2, "35", "VIP");
      expect(await screen.findByText("Total: $30.000")).toBeInTheDocument();

      await user.click(botonQuitar());

      expect(await screen.findByText("Total: $10.000")).toBeInTheDocument();
    });
  });

  it("envía la compra con la fecha, la forma de pago y cada entrada", async () => {
    vi.mocked(api.comprar).mockResolvedValue({
      compraId: 1,
      cantidadEntradas: 2,
      fechaVisita: "2026-10-20",
      total: 30000,
      urlRedireccion: null,
      emailConfirmacion: "ana@mail.com",
      mensaje: "Compraste 2 entradas para el 20/10/2026",
    });
    const user = renderizar();
    await user.click(await botonDia(/20\/10\/2026/));
    await user.click(botonAgregar());
    await completarVisitante(user, 1, "30", "Común");
    await completarVisitante(user, 2, "8", "VIP");
    await user.click(screen.getByLabelText(/Efectivo/));

    await user.click(botonConfirmar());

    await waitFor(() =>
      expect(api.comprar).toHaveBeenCalledWith({
        fechaVisita: "2026-10-20",
        formaPago: "EFECTIVO",
        entradas: [
          { edad: 30, tipoPase: "COMUN" },
          { edad: 8, tipoPase: "VIP" },
        ],
      }),
    );
  });
});
