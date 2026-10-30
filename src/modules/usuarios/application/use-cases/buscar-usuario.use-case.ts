import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { Usuario } from '../../domain/entities/usuario.entity.js';
import type { UsuarioRepository } from '../../domain/repositories/usuario.repository.js';

import { USUARIO_REPOSITORY } from '../../domain/repositories/usuario.repository.token.js';

@Injectable()
export class BuscarUsuarioUseCase {
  constructor(
    /**
     * O NestJS utiliza o token para localizar a implementação
     * registrada no UsuariosModule.
     *
     * Assim, este caso de uso não precisa conhecer o TypeORM.
     */
    @Inject(USUARIO_REPOSITORY)
    private readonly usuarioRepository: UsuarioRepository,
  ) {}

  async executar(id: string): Promise<Usuario> {
    const usuario = await this.usuarioRepository.buscarPorId(id);

    // O caso de uso define o comportamento quando o usuário não existe.
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return usuario;
  }
}
