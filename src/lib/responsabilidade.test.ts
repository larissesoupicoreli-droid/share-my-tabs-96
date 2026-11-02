import { describe, expect, test } from "bun:test";
import { resolveResponsabilidade } from "./responsabilidade";

describe("troca de responsável", () => {
  test("selecionar Tatah substitui a divisão pelo valor inteiro para ela", () => {
    expect(resolveResponsabilidade(true, "tatah-id", "larisse-id")).toEqual({
      manterRateio: false, responsavelCompra: "tatah-id", responsavelParcela: "tatah-id", removerRateio: true,
    });
  });
  test("manter divisão não remove o rateio existente", () => {
    expect(resolveResponsabilidade(true, "manter-rateio", "larisse-id")).toEqual({
      manterRateio: true, responsavelCompra: "larisse-id", responsavelParcela: null, removerRateio: false,
    });
  });
});