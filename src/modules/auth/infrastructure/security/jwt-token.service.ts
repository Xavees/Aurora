import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import type {
  TokenPayload,
  TokenService,
} from '../../application/services/token-service.interface.js';

@Injectable()
export class JwtTokenService implements TokenService {
  constructor(
    private readonly jwtService: JwtService,
  ) {}

  async gerarAccessToken(payload: TokenPayload): Promise<string> {
    /**
     * O JwtService utiliza a chave e o tempo de expiração
     * configurados no JwtModule.
     *
     * Nunca colocamos senha, hash ou dados sensíveis
     * dentro do payload do JWT.
     */
    return this.jwtService.signAsync({
      sub: payload.sub,
      email: payload.email,
    });
  }
}