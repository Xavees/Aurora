
import type { FuncaoMembro } from '../entities/membro-circulo.entity.js';

export type ResultadoAlteracaoFuncao =
  | 'FUNCAO_ALTERADA'
  | 'CIRCULO_NAO_ENCONTRADO'
  | 'SOLICITANTE_NAO_E_ADMINISTRADOR'
  | 'MEMBRO_NAO_ENCONTRADO'
  | 'ULTIMO_ADMINISTRADOR'
  | 'FUNCAO_JA_ATRIBUIDA';

export interface AlterarFuncaoMembroTransacionalRepository {
  alterarFuncao(
    circuloId: string,
    solicitanteId: string,
    usuarioAlvoId: string,
    novaFuncao: FuncaoMembro,
  ): Promise<ResultadoAlteracaoFuncao>;
}
