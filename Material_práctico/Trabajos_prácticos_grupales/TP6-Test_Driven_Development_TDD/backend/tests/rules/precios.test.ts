import { describe, expect, it } from "vitest";
import { TipoPase } from "../../src/entities/tipo-pase";
import type { EntradaSolicitada } from "../../src/entities/entrada-solicitada";
import { calcularPrecioEntrada, calcularTotal } from "../../src/rules/precios";

const entrada = (edad: number, tipoPase: TipoPase): EntradaSolicitada => ({
  edad,
  tipoPase,
});

describe("calcularPrecioEntrada", () => {
  describe("precio base según tipo de pase", () => {
    it("un adulto con pase Común paga $10.000", () => {
      expect(calcularPrecioEntrada(entrada(30, TipoPase.COMUN))).toBe(10000);
    });

    it("un adulto con pase VIP paga $20.000", () => {
      expect(calcularPrecioEntrada(entrada(30, TipoPase.VIP))).toBe(20000);
    });
  });

  describe("menores de hasta 3 años no pagan", () => {
    it.each([
      [0, TipoPase.COMUN],
      [3, TipoPase.COMUN],
      [0, TipoPase.VIP],
      [3, TipoPase.VIP],
    ])("%i años con pase %s no paga", (edad, tipoPase) => {
      expect(calcularPrecioEntrada(entrada(edad, tipoPase))).toBe(0);
    });
  });

  describe("menores de hasta 15 años pagan el 50%", () => {
    it.each([
      [4, TipoPase.COMUN, 5000],
      [15, TipoPase.COMUN, 5000],
      [4, TipoPase.VIP, 10000],
      [15, TipoPase.VIP, 10000],
    ])("%i años con pase %s paga $%i", (edad, tipoPase, esperado) => {
      expect(calcularPrecioEntrada(entrada(edad, tipoPase))).toBe(esperado);
    });

    it("16 años paga el precio completo", () => {
      expect(calcularPrecioEntrada(entrada(16, TipoPase.COMUN))).toBe(10000);
    });
  });

  describe("mayores de 60 años o más pagan el 50%", () => {
    it.each([
      [60, TipoPase.COMUN, 5000],
      [85, TipoPase.COMUN, 5000],
      [60, TipoPase.VIP, 10000],
    ])("%i años con pase %s paga $%i", (edad, tipoPase, esperado) => {
      expect(calcularPrecioEntrada(entrada(edad, tipoPase))).toBe(esperado);
    });

    it("59 años paga el precio completo", () => {
      expect(calcularPrecioEntrada(entrada(59, TipoPase.VIP))).toBe(20000);
    });
  });
});

describe("calcularTotal", () => {
  it("una compra sin entradas suma $0", () => {
    expect(calcularTotal([])).toBe(0);
  });

  it("suma el precio de un grupo con edades y pases mezclados", () => {
    const entradas = [
      entrada(35, TipoPase.COMUN), // 10000
      entrada(35, TipoPase.VIP), // 20000
      entrada(10, TipoPase.COMUN), // 5000
      entrada(2, TipoPase.VIP), // 0
      entrada(70, TipoPase.VIP), // 10000
    ];

    expect(calcularTotal(entradas)).toBe(45000);
  });
});
