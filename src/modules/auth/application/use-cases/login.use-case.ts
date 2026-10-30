import {
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { AuthRepository } from '../../domain/repositories/auth.repository.js';
import { AUTH_REPOSITORY } from '../../domain/repositories/auth.repository.token.js';

import type { PasswordHasher } from '../services/password-hasher.interface.js';
import { PASSWORD_HASHER } from '../services/password-hasher.token.js';

import type { TokenService } from '../services/token-service.interface.js';
import { TOKEN_SERVICE } from '../services/token-service.token.js';

export interface LoginInput {
  email: string;
  senha: string;
}

export interface LoginResult {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: AuthRepository,

    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,

    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenService,
  ) {}

  async executar(input: LoginInput): Promise<LoginResult> {
    const email = input.email.trim().toLowerCase();

    const usuario = await this.authRepository.buscarPorEmail(email);

    /**
     * Utilizamos uma mensagem genérica para não informar
     * se o e-mail existe ou não no banco.
     */
    if (!usuario || !usuario.senhaHash) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const senhaValida = await this.passwordHasher.verificar(
      usuario.senhaHash,
      input.senha,
    );

    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    /**
     * Somente depois de validar as credenciais
     * emitimos um token assinado para o usuário.
     */
    const accessToken = await this.tokenService.gerarAccessToken({
      sub: usuario.id,
      email: usuario.email,
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 900,
    };
  }
}