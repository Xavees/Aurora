import type { ContatoEmergencia } from '../entities/contato-emergencia.entity.js';

export interface CriarContatoDados {
  nome: string;
  parentesco: string | null;
  telefone: string;
  usuarioId: string;
}

export interface AtualizarContatoDados {
  nome?: string;
  parentesco?: string | null;
  telefone?: string;
}

export interface ContatoEmergenciaRepository {
  criar(dados: CriarContatoDados): Promise<ContatoEmergencia>;

  listarPorUsuario(usuarioId: string): Promise<ContatoEmergencia[]>;

  buscarPorIdEUsuario(
    contatoId: string,
    usuarioId: string,
  ): Promise<ContatoEmergencia | null>;

  atualizar(
    contatoId: string,
    usuarioId: string,
    dados: AtualizarContatoDados,
  ): Promise<ContatoEmergencia | null>;

  remover(contatoId: string, usuarioId: string): Promise<boolean>;
}
