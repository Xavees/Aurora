
export interface CandidatoSucessao {
  id: string;
  usuarioId: string;
  dataEntrada: Date;
  ativo: boolean;
}

/**
 * Seleciona o participante ativo mais antigo.
 *
 * O usuário que está saindo nunca poderá
 * receber novamente a administração.
 *
 * Em caso de empate na data de entrada,
 * utilizamos o ID da participação.
 */
export function selecionarSucessorCirculo(
  candidatos: readonly CandidatoSucessao[],
  usuarioSaindoId: string,
): CandidatoSucessao | null {
  const elegiveis = candidatos
    .filter(
      (candidato) =>
        candidato.ativo &&
        candidato.usuarioId !== usuarioSaindoId,
    )
    .sort((a, b) => {
      const diferencaData =
        a.dataEntrada.getTime() - b.dataEntrada.getTime();

      if (diferencaData !== 0) {
        return diferencaData;
      }

      // BIGINT não deve ser convertido para Number:
      // isso poderia causar perda de precisão.
      const idA = BigInt(a.id);
      const idB = BigInt(b.id);

      if (idA < idB) return -1;
      if (idA > idB) return 1;

      return 0;
    });

  return elegiveis[0] ?? null;
}
