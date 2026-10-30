import {
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';

import type { AuthRepository } from '../../domain/repositories/auth.repository.js';
import { AUTH_REPOSITORY } from '../../domain/repositories/auth.repository.token.js';

import type { PasswordHasher } from '../services/password-hasher.interface.js';
import { PASSWORD_HASHER } from '../services/password-hasher.token.js';

export interface CadastroUsuarioInput {
  nome: string;
  email: string;
  senha: string;
}

export interface CadastroUsuarioResult {
  usuarioId: string;
  email: string;
}

@Injectable()
export class CadastroUsuarioUseCase {
  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: AuthRepository,

    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async executar(
    input: CadastroUsuarioInput,
  ): Promise<CadastroUsuarioResult> {
    const nome = input.nome.trim();
    const email = input.email.trim().toLowerCase();

    /**
     * Verificamos previamente se o e-mail já está cadastrado
     * para apresentar uma mensagem de erro compreensível.
     *
     * A restrição UNIQUE do MySQL continua necessária,
     * pois duas requisições simultâneas podem passar
     * por esta verificação.
     */
    const usuarioExistente =
      await this.authRepository.buscarPorEmail(email);

    if (usuarioExistente) {
      throw new ConflictException('E-mail já cadastrado.');
    }

    /**
     * O hash é gerado antes da persistência.
     * A senha original nunca é enviada ao repositório.
     */
    const senhaHash = await this.passwordHasher.hash(input.senha);

    const usuarioId = await this.authRepository.criarUsuario({
      nome,
      email,
      senhaHash,
    });

    return {
      usuarioId,
      email,
    };
  }
}