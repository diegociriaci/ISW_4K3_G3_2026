import { describe, expect, it } from "vitest";
import type { Momento } from "../../src/entities/momento";
import {
  estaAbierto,
  validarFechaVisita,
} from "../../src/rules/calendario-parque";
import {
  FechaFueraDeVentanaError,
  FechaInvalidaError,
  FechaPasadaError,
  HorarioDeCompraVencidoError,
  ParqueCerradoError,
} from "../../src/errors/errores-negocio";

// Miércoles 14/10/2026 a la mañana
const ahora: Momento = { fecha: "2026-10-14", hora: "10:00" };

describe("estaAbierto", () => {
  it("el parque abre un día normal (martes)", () => {
    expect(estaAbierto("2026-10-20")).toBe(true);
  });

  it("el parque cierra los lunes", () => {
    expect(estaAbierto("2026-10-19")).toBe(false);
  });

  it.each(["2026-12-25", "2027-12-25", "2027-01-01", "2028-01-01"])(
    "el parque cierra el feriado %s",
    (fecha) => {
      expect(estaAbierto(fecha)).toBe(false);
    },
  );

  it("el parque abre el 24/12", () => {
    expect(estaAbierto("2026-12-24")).toBe(true);
  });
});

describe("validarFechaVisita", () => {
  describe("formato", () => {
    it.each(["", "14/10/2026", "2026-13-01", "2026-02-30", "mañana"])(
      "rechaza la fecha inválida '%s'",
      (fecha) => {
        expect(() => validarFechaVisita(fecha, ahora)).toThrow(
          FechaInvalidaError,
        );
      },
    );
  });

  describe("fecha de hoy o futura", () => {
    it("acepta la fecha de hoy", () => {
      expect(() => validarFechaVisita("2026-10-14", ahora)).not.toThrow();
    });

    it("rechaza una fecha pasada", () => {
      expect(() => validarFechaVisita("2026-10-13", ahora)).toThrow(
        FechaPasadaError,
      );
    });
  });

  describe("hasta 1 mes de anticipación", () => {
    it("acepta el mismo día del mes siguiente", () => {
      expect(() => validarFechaVisita("2026-11-14", ahora)).not.toThrow();
    });

    it("rechaza el día posterior al mismo día del mes siguiente", () => {
      expect(() => validarFechaVisita("2026-11-15", ahora)).toThrow(
        FechaFueraDeVentanaError,
      );
    });

    it("si el mes siguiente no tiene ese día, el límite es su último día", () => {
      const finDeMes: Momento = { fecha: "2027-01-31", hora: "10:00" };

      expect(() => validarFechaVisita("2027-02-28", finDeMes)).not.toThrow();
      expect(() => validarFechaVisita("2027-03-01", finDeMes)).toThrow(
        FechaFueraDeVentanaError,
      );
    });
  });

  describe("días en que el parque está cerrado", () => {
    it("rechaza un lunes", () => {
      expect(() => validarFechaVisita("2026-10-19", ahora)).toThrow(
        ParqueCerradoError,
      );
    });

    it("rechaza el 25/12", () => {
      const diciembre: Momento = { fecha: "2026-12-01", hora: "10:00" };

      expect(() => validarFechaVisita("2026-12-25", diciembre)).toThrow(
        ParqueCerradoError,
      );
    });

    it("rechaza el 1/1", () => {
      const diciembre: Momento = { fecha: "2026-12-15", hora: "10:00" };

      expect(() => validarFechaVisita("2027-01-01", diciembre)).toThrow(
        ParqueCerradoError,
      );
    });
  });

  describe("compra para el mismo día hasta las 17:30", () => {
    it("acepta comprar a las 17:30", () => {
      const limite: Momento = { fecha: "2026-10-14", hora: "17:30" };

      expect(() => validarFechaVisita("2026-10-14", limite)).not.toThrow();
    });

    it("rechaza comprar a las 17:31", () => {
      const tarde: Momento = { fecha: "2026-10-14", hora: "17:31" };

      expect(() => validarFechaVisita("2026-10-14", tarde)).toThrow(
        HorarioDeCompraVencidoError,
      );
    });

    it("después de las 17:30 se puede comprar para el día siguiente", () => {
      const noche: Momento = { fecha: "2026-10-14", hora: "23:00" };

      expect(() => validarFechaVisita("2026-10-15", noche)).not.toThrow();
    });
  });
});
