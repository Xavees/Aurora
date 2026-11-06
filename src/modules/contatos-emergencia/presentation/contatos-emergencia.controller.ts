
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
Param,Patch,
  Post,  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/infrastructure/security/guards/jwt-auth.guard.js';
import { CriarContatoUseCase } from '../application/use-cases/criar-contato.use-case.js';
import { ListarContatosUseCase } from '../application/use-cases/listar-contatos.use-case.js';
import { AtualizarContatoUseCase } from '../application/use-cases/atualizar-contato.use-case.js';
import { RemoverContatoUseCase } from '../application/use-cases/remover-contato.use-case.js';
import { CriarContatoDto } from './http/criar-contato.dto.js';
import { ContatoResponseDto } from './http/contato-response.dto.js';
import { AtualizarContatoDto } from './http/atualizar-contato.dto.js';
import { UsuarioAtual } from '../../auth/presentation/http/decorators/usuario-atual.decorator.js';
import type { UsuarioAutenticado } from '../../auth/domain/entitites/usuario-autenticado.entity.js';


@Controller('contatos-emergencia')
@UseGuards(JwtAuthGuard)
export class ContatosEmergenciaController {
  constructor(
    private readonly criarContato: CriarContatoUseCase,
    private readonly listarContatos: ListarContatosUseCase,
    private readonly atualizarContato: AtualizarContatoUseCase,
    private readonly removerContato: RemoverContatoUseCase,
  ) {}

  @Post()
  async criar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dados: CriarContatoDto,
  ): Promise<ContatoResponseDto> {
    const contato = await this.criarContato.executar({
      nome: dados.nome,
      parentesco: dados.parentesco ?? null,
      telefone: dados.telefone,
      usuarioId: usuario.id,
    });

    return ContatoResponseDto.fromDomain(contato);
  }

  @Get()
  async listar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<ContatoResponseDto[]> {
    const contatos = await this.listarContatos.executar(usuario.id);

    return contatos.map((contato) =>
      ContatoResponseDto.fromDomain(contato),
    );
  }

  @Patch(':id')
  async atualizar(
    @Param('id') contatoId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dados: AtualizarContatoDto,
  ): Promise<ContatoResponseDto> {
    const contato = await this.atualizarContato.executar(
      contatoId,
      usuario.id,
      dados,
    );

    return ContatoResponseDto.fromDomain(contato);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remover(
    @Param('id') contatoId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<void> {
    await this.removerContato.executar(contatoId, usuario.id);
  }
}
