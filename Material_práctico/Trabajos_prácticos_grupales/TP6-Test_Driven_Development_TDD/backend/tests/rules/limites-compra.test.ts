import { describe, expect, it } from "vitest";
import type { EntradaSolicitada } from "../../src/entities/entrada-solicitada";
import { TipoPase } from "../../src/entities/tipo-pase";
import {
  validarEntradas,
  validarLimiteAcumulado,
} from "../../src/rules/limites-compra";
import {
  CantidadInvalidaError,
  EdadInvalidaError,
  LimiteAcumuladoExcedidoError,
  TipoPaseInvalidoError,
} from "../../src/errors/errores-negocio";

const adultoComun: EntradaSolicitada = { edad: 30, tipoPase: TipoPase.COMUN };

const entradas = (cantidad: number): EntradaSolicitada[] =>
  Array.from({ length: cantidad }, () => ({ ...adultoComun }));

describe("validarEntradas", () => {
  describe("cantidad de entradas por compra (1 a 10)", () => {
    it.each([1, 10])("acepta %i entradas", (cantidad) => {
      expect(() => validarEntradas(entradas(cantidad))).not.toThrow();
    });

    it.each([0, 11])("rechaza %i entradas", (cantidad) => {
      expect(() => validarEntradas(entradas(cantidad))).toThrow(
        CantidadInvalidaError,
      );
    });
  });

  describe("edad de cada visitante (entero entre 0 y 120)", () => {
    it.each([0, 120])("acepta la edad %i", (edad) => {
      expect(() =>
        validarEntradas([{ edad, tipoPase: TipoPase.COMUN }]),
      ).not.toThrow();
    });

    it.each([-1, 121, 10.5, Number.NaN])("rechaza la edad %s", (edad) => {
      expect(() =>
        validarEntradas([adultoComun, { edad, tipoPase: TipoPase.COMUN }]),
      ).toThrow(EdadInvalidaError);
    });
  });

  describe("tipo de pase de cada entrada", () => {
    it("acepta una compra con pases mezclados (VIP y Común)", () => {
      expect(() =>
        validarEntradas([
          { edad: 30, tipoPase: TipoPase.VIP },
          { edad: 8, tipoPase: TipoPase.COMUN },
        ]),
      ).not.toThrow();
    });

    it("rechaza una entrada con un tipo de pase inexistente", () => {
      const pasePlatino = {
        edad: 30,
        tipoPase: "PLATINO",
      } as unknown as EntradaSolicitada;

      expect(() => validarEntradas([adultoComun, pasePlatino])).toThrow(
        TipoPaseInvalidoError,
      );
    });

    it("rechaza una entrada sin tipo de pase", () => {
      const sinPase = { edad: 30 } as unknown as EntradaSolicitada;

      expect(() => validarEntradas([sinPase])).toThrow(TipoPaseInvalidoError);
    });
  });
});

describe("validarLimiteAcumulado (máximo 10 por usuario y fecha)", () => {
  it.each([
    [0, 10],
    [6, 4],
  ])("acepta %i ya compradas + %i nuevas", (yaCompradas, nuevas) => {
    expect(() => validarLimiteAcumulado(yaCompradas, nuevas)).not.toThrow();
  });

  it.each([
    [6, 5],
    [10, 1],
  ])("rechaza %i ya compradas + %i nuevas", (yaCompradas, nuevas) => {
    expect(() => validarLimiteAcumulado(yaCompradas, nuevas)).toThrow(
      LimiteAcumuladoExcedidoError,
    );
  });
});
