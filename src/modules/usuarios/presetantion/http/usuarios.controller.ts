
import {Controller,  ForbiddenException,Get,Param,UseGuards,} from '@nestjs/common';
import { BuscarUsuarioUseCase } from '../../application/use-cases/buscar-usuario.use-case.js';
import { BuscarUsuarioParamDto } from './dto/buscar-usuario-param.dto.js';
import { UsuarioResponseDto } from './dto/usuario-response.dto.js';
import { JwtAuthGuard } from '../../../auth/infrastructure/security/guards/jwt-auth.guard.js';
import { UsuarioAtual } from '../../../auth/presentation/http/decorators/usuario-atual.decorator.js';
import type { UsuarioAutenticado } from '../../../auth/domain/entitites/usuario-autenticado.entity.js';
import {Body,Patch,} from '@nestjs/common';
import { AtualizarUsuarioUseCase } from '../../application/use-cases/atualizar-usuario.use-case.js';
import { AtualizarUsuarioDto } from './dto/atualizar-usuario.dto.js';

@Controller('usuarios')
@UseGuards(JwtAuthGuard)
export class UsuariosController {
  constructor(
    private readonly buscarUsuarioUseCase: BuscarUsuarioUseCase,
    private readonly atualizarUsuarioUseCase: AtualizarUsuarioUseCase,
  ) {}

// METODO GET, PRA OBTER ALGUM DADO!

  @Get(':id')
  async buscarPorId(
    @Param() params: BuscarUsuarioParamDto,
    @UsuarioAtual() usuarioAtual: UsuarioAutenticado,
  ): Promise<UsuarioResponseDto> {

    /**
     * AUTORIZAÇÃO
     *
     * O JWT informa quem está autenticado.
     * O parâmetro da URL informa qual perfil foi solicitado.
     *
     * Se os IDs forem diferentes, bloqueamos o acesso.
     */
    if (usuarioAtual.id !== params.id) {
      throw new ForbiddenException(
        'Você não possui permissão para acessar este usuário.',
      );
    }

    /**
     * REGRA DE NEGÓCIO
     *
     * O Controller delega a consulta ao caso de uso.
     * O caso de uso utiliza o Repository Pattern
     * para buscar os dados no banco.
     */
    const usuario = await this.buscarUsuarioUseCase.executar(
      params.id,
    );

    /**
     * RESPOSTA HTTP
     *
     * Retornamos apenas os campos definidos no DTO.
     * Nunca retornamos senha ou hash.
     */
    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      telefone: usuario.telefone,
      fotoUrl: usuario.fotoUrl,
      tipoUsuario: usuario.tipoUsuario,
    };
  }



// Metodo PATCH / ATUALIZAR PARCIALMENTE

  @Patch(':id')
async atualizar(
  @Param() params: BuscarUsuarioParamDto,
  @Body() dados: AtualizarUsuarioDto,
  @UsuarioAtual() usuarioAtual: UsuarioAutenticado,
): Promise<UsuarioResponseDto> {
  /**
   * AUTORIZAÇÃO
   *
   * Impedimos que um usuário altere
   * o perfil de outra pessoa.
   */
  if (usuarioAtual.id !== params.id) {
    throw new ForbiddenException(
      'Você não possui permissão para alterar este usuário.',
    );
  }

  const usuario = await this.atualizarUsuarioUseCase.executar(
    params.id,
    dados,
  );

  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    telefone: usuario.telefone,
    fotoUrl: usuario.fotoUrl,
    tipoUsuario: usuario.tipoUsuario,
  };
}

}
