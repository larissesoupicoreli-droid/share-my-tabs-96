import { describe, it as test } from "node:test";
import { deepStrictEqual } from "node:assert";
import { resolveResponsabilidade } from "./responsabilidade";

describe("troca de responsável", () => {
  test("selecionar Tatah substitui a divisão pelo valor inteiro para ela", () => {
    deepStrictEqual(resolveResponsabilidade(true, "tatah-id", "larisse-id"), {
      manterRateio: false, responsavelCompra: "tatah-id", responsavelParcela: "tatah-id", removerRateio: true,
    });
  });
  test("manter divisão não remove o rateio existente", () => {
    deepStrictEqual(resolveResponsabilidade(true, "manter-rateio", "larisse-id"), {
      manterRateio: true, responsavelCompra: "larisse-id", responsavelParcela: null, removerRateio: false,
    });
  });
});