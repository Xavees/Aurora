import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';

import { CadastroUsuarioUseCase } from '../../application/use-cases/cadastro-usuario.use-case.js';

import { CadastroUsuarioDto } from './dto/cadastro-usuario.dto.js';


import { LoginUseCase } from '../../application/use-cases/login.use-case.js';
import type { LoginResult } from '../../application/use-cases/login.use-case.js';
import { LoginDto } from './dto/login.dto.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly cadastroUsuarioUseCase: CadastroUsuarioUseCase,
    private readonly loginUseCase: LoginUseCase,
  ) {}


  // rota de registro de usuarios

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  async cadastrar(
    @Body() dados: CadastroUsuarioDto,
  ): Promise<{ usuarioId: string; email: string }> {
    /**
     * O Controller não acessa diretamente o banco
     * nem gera o hash da senha.
     *
     * Ele apenas recebe os dados validados e delega
     * a operação ao caso de uso correspondente.
     */
    return this.cadastroUsuarioUseCase.executar(dados);
  }


  // rota de login
@Post('login')
@HttpCode(HttpStatus.OK)
@Throttle({
  default: {
    limit: 5,
    ttl: 60_000,
  },
})
async login(@Body() dados: LoginDto): Promise<LoginResult> {
  /**
   * O Controller delega a autenticação ao caso de uso.
   * Não consulta o banco nem verifica senhas diretamente.
   */
  return this.loginUseCase.executar(dados);
}
}