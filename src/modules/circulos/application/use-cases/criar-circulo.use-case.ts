import { ConflictException, Inject, Injectable,} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Circulo } from '../../domain/entities/circulo.entity.js';
import type { CirculoRepository } from '../../domain/repositories/circulo.repository.js';
import { CIRCULO_REPOSITORY } from '../../domain/repositories/circulo.repository.token.js';
import type { CriarCirculoTransacionalRepository } from '../../domain/repositories/criar-circulo-transacional.repository.js';
import { CRIAR_CIRCULO_TRANSACIONAL_REPOSITORY } from '../../domain/repositories/criar-circulo-transacional.repository.token.js';

export interface CriarCirculoInput {
  nome: string;
  criadorId: string;
}

@Injectable()
export class CriarCirculoUseCase {
  constructor(
    @Inject(CIRCULO_REPOSITORY)
    private readonly circuloRepository: CirculoRepository,

    @Inject(CRIAR_CIRCULO_TRANSACIONAL_REPOSITORY)
    private readonly transacionalRepository: CriarCirculoTransacionalRepository,
  ) {}

  /**
   * Gera um código aleatório de 10 caracteres hexadecimais.
   * Utiliza uma fonte criptograficamente segura.
   */
  private gerarCodigoConvite(): string {
    return randomBytes(5).toString('hex').toUpperCase();
  }

  
async executar(dados: CriarCirculoInput): Promise<Circulo> {
  const maxTentativas = 5;

  for (let tentativa = 0; tentativa < maxTentativas; tentativa++) {
    const codigoConvite = this.gerarCodigoConvite();

    // Verifica se o código já pertence a um círculo ativo.
    const existente =
      await this.circuloRepository.buscarPorCodigoConvite(
        codigoConvite,
      );

    if (existente) {
      continue;
    }

    // Cria o círculo e seu administrador na mesma transação.
    const resultado =
      await this.transacionalRepository.criarComAdministrador({
        nome: dados.nome,
        codigoConvite,
        criadorId: dados.criadorId,
      });

    // Criação concluída com sucesso.
    if (resultado.status === 'CIRCULO_CRIADO') {
      return resultado.circulo;
    }

    /**
     * Se o código estiver duplicado, inclusive em um
     * círculo desativado, o laço gera outro código.
     */
  }

  throw new ConflictException(
    'Não foi possível gerar um código de convite disponível.',
  );
}

}
