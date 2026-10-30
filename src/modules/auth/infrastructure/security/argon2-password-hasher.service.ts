import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

import type { PasswordHasher } from '../../application/services/password-hasher.interface.js';

@Injectable()
export class Argon2PasswordHasherService implements PasswordHasher {
  /**
   * Gera um hash usando Argon2id.
   *
   * O salt é gerado automaticamente pela biblioteca.
   * O hash resultante contém os parâmetros necessários
   * para sua verificação posterior.
   */
  async hash(senha: string): Promise<string> {
    return argon2.hash(senha, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  /**
   * Verifica a senha sem armazená-la ou recuperá-la
   * em texto puro.
   */
  async verificar(
    hashArmazenado: string,
    senhaInformada: string,
  ): Promise<boolean> {
    return argon2.verify(hashArmazenado, senhaInformada);
  }
}