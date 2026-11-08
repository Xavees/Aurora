
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  Patch,
  Get,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/infrastructure/security/guards/jwt-auth.guard.js';

import { UsuarioAtual } from '../../auth/presentation/http/decorators/usuario-atual.decorator.js';

import type { UsuarioAutenticado } from '../../auth/domain/entitites/usuario-autenticado.entity.js';

import { CriarCirculoUseCase } from '../application/use-cases/criar-circulo.use-case.js';
import { RemoverMembroCirculoUseCase } from '../application/use-cases/remover-membro-circulo.use-case.js';

import { CriarCirculoDto } from './dto/criar-circulo.dto.js';

import { PositiveBigIntPipe } from '../../../common/pipes/positive-bigint.pipe.js';
import { AlterarFuncaoMembroDto } from './dto/alterar-funcao-membro.dto.js';
import { AlterarFuncaoMembroCirculoUseCase } from '../application/use-cases/alterar-funcao-membro-circulo.use-case.js';
import { ListarCirculosUseCase } from '../application/use-cases/listar-circulos.use-case.js';

import { CirculoResponseDto } from './dto/circulo-response.dto.js';
import { BuscarCirculoUseCase } from '../application/use-cases/buscar-circulo.use-case.js';
import { AtualizarCirculoUseCase } from '../application/use-cases/atualizar-circulo.use-case.js';
import { AtualizarCirculoDto } from './dto/atualizar-circulo.dto.js';
import { RemoverCirculoUseCase } from '../application/use-cases/remover-circulo.use-case.js';
import { EntrarCirculoUseCase } from '../application/use-cases/entrar-circulo.use-case.js';

import { EntrarCirculoDto } from './dto/entrar-circulo.dto.js';
import { ListarMembrosCirculoUseCase } from '../application/use-cases/listar-membros-circulo.use-case.js';
import { MembroCirculoResponseDto } from './dto/membro-circulo-response.dto.js';
import { SairCirculoUseCase } from '../application/use-cases/sair-circulo.use-case.js';
import { RenovarCodigoConviteUseCase } from '../application/use-cases/renovar-codigo-convite.use-case.js';
import { DesbloquearMembroCirculoUseCase } from '../application/use-cases/desbloquear-membro-circulo.use-case.js';
@Controller('circulos')
@UseGuards(JwtAuthGuard)
export class CirculosController {
  constructor(
    private readonly criarCirculo: CriarCirculoUseCase,
    private readonly removerMembroCirculo: RemoverMembroCirculoUseCase,
    private readonly alterarFuncaoMembro: AlterarFuncaoMembroCirculoUseCase,
    private readonly listarCirculos: ListarCirculosUseCase,
    private readonly buscarCirculo: BuscarCirculoUseCase,
    private readonly atualizarCirculo: AtualizarCirculoUseCase,
    private readonly removerCirculo: RemoverCirculoUseCase,
    private readonly entrarCirculo: EntrarCirculoUseCase,
    private readonly listarMembrosCirculo: ListarMembrosCirculoUseCase,
    private readonly sairCirculo: SairCirculoUseCase,
    private readonly renovarCodigoConvite: RenovarCodigoConviteUseCase,
    private readonly desbloquearMembro: DesbloquearMembroCirculoUseCase,
  ) {}

  // Cria um círculo e registra o usuário autenticado como administrador.
  @Post()
  async criar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dados: CriarCirculoDto,
  ) {
    return this.criarCirculo.executar({
      nome: dados.nome,
      criadorId: usuario.id,
    });
  }




/**
 * Permite que o usuário autenticado saia de um círculo.
 *
 * O repositório transacional garante que:
 * - A saída seja realizada de forma consistente.
 * - A administração seja transferida quando necessário.
 * - O círculo seja desativado se ficar sem participantes.
 */
@Delete(':id/membros/eu')
@HttpCode(HttpStatus.NO_CONTENT)
async sair(
  @UsuarioAtual() usuario: UsuarioAutenticado,
  @Param('id', PositiveBigIntPipe) circuloId: string,
): Promise<void> {
  await this.sairCirculo.executar(
    circuloId,
    usuario.id,
  );
}



























  /**
   * Remove administrativamente um participante.
   *
   * O solicitante é identificado pelo JWT.
   * O caso de uso verifica suas permissões e
   * executa a remoção por meio do repository transacional.
   */
  @Delete(':id/membros/:usuarioId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removerMembro(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', PositiveBigIntPipe) circuloId: string,
    @Param('usuarioId', PositiveBigIntPipe) usuarioAlvoId: string,
  ): Promise<void> {
    await this.removerMembroCirculo.executar(
      circuloId,
      usuario.id,
      usuarioAlvoId,
    );
  }



/**
 * Remove o bloqueio administrativo de um usuário.
 *
 * Apenas administradores podem executar esta operação.
 * O desbloqueio não adiciona automaticamente o usuário
 * ao círculo.
 */
@Delete(':id/bloqueios/:usuarioId')
@HttpCode(HttpStatus.NO_CONTENT)
async desbloquear(
  @UsuarioAtual() usuario: UsuarioAutenticado,
  @Param('id', PositiveBigIntPipe) circuloId: string,
  @Param('usuarioId', PositiveBigIntPipe) usuarioAlvoId: string,
): Promise<void> {
  await this.desbloquearMembro.executar(
    circuloId,
    usuario.id,
    usuarioAlvoId,
  );
}























  
/**
 * Promove ou rebaixa um participante do círculo.
 *
 * Apenas administradores podem executar esta operação.
 * A verificação de permissões e a alteração da função
 * são realizadas dentro de uma transação.
 */
@Patch(':id/membros/:usuarioId/funcao')
@HttpCode(HttpStatus.NO_CONTENT)
async alterarFuncao(
  @UsuarioAtual() usuario: UsuarioAutenticado,
  @Param('id', PositiveBigIntPipe) circuloId: string,
  @Param('usuarioId', PositiveBigIntPipe) usuarioAlvoId: string,
  @Body() dados: AlterarFuncaoMembroDto,
): Promise<void> {
  await this.alterarFuncaoMembro.executar(
    circuloId,
    usuario.id,
    usuarioAlvoId,
    dados.funcao,
  );
}



/**
 * Lista os círculos dos quais o usuário
 * autenticado participa.
 */
@Get()
async listar(
  @UsuarioAtual() usuario: UsuarioAutenticado,
): Promise<CirculoResponseDto[]> {
  const circulos = await this.listarCirculos.executar(usuario.id);

  return circulos.map((circulo) =>
    CirculoResponseDto.fromDomain(circulo),
  );
}






/**
 * Consulta um círculo específico.
 *
 * Apenas usuários que participam do círculo
 * possuem permissão para visualizar seus dados.
 */
@Get(':id')
async buscar(
  @UsuarioAtual() usuario: UsuarioAutenticado,
  @Param('id', PositiveBigIntPipe) circuloId: string,
): Promise<CirculoResponseDto> {
  const circulo = await this.buscarCirculo.executar(
    circuloId,
    usuario.id,
  );

  return CirculoResponseDto.fromDomain(circulo);
}



/**
 * Atualiza o nome de um círculo.
 *
 * Apenas administradores possuem permissão
 * para realizar esta operação.
 */
@Patch(':id')
async atualizar(
  @UsuarioAtual() usuario: UsuarioAutenticado,
  @Param('id', PositiveBigIntPipe) circuloId: string,
  @Body() dados: AtualizarCirculoDto,
): Promise<CirculoResponseDto> {
  const circuloAtualizado = await this.atualizarCirculo.executar(
    circuloId,
    usuario.id,
    { nome: dados.nome },
  );

  return CirculoResponseDto.fromDomain(circuloAtualizado);
}





/**
 * Renova o código de convite de um círculo.
 *
 * Apenas administradores podem executar esta operação.
 * O código anterior é invalidado após a atualização.
 */
@Post(':id/codigo-convite/renovar')
@HttpCode(HttpStatus.OK)
async renovarConvite(
  @UsuarioAtual() usuario: UsuarioAutenticado,
  @Param('id', PositiveBigIntPipe) circuloId: string,
): Promise<{ codigoConvite: string }> {
  return this.renovarCodigoConvite.executar(
    circuloId,
    usuario.id,
  );
}






















/**
 * Desativa um círculo de segurança.
 *
 * Apenas administradores podem executar esta operação.
 * O círculo é desativado por soft delete,
 * preservando os registros no banco de dados.
 */
@Delete(':id')
@HttpCode(HttpStatus.NO_CONTENT)
async remover(
  @UsuarioAtual() usuario: UsuarioAutenticado,
  @Param('id', PositiveBigIntPipe) circuloId: string,
): Promise<void> {
  await this.removerCirculo.executar(
    circuloId,
    usuario.id,
  );
}



// agora é os USER



/**
 * Permite que o usuário autenticado entre
 * em um círculo utilizando o código de convite.
 *
 * Novos participantes recebem a função MEMBRO.
 */
@Post('entrar')
async entrar(
  @UsuarioAtual() usuario: UsuarioAutenticado,
  @Body() dados: EntrarCirculoDto,
): Promise<MembroCirculoResponseDto> {
  const membro = await this.entrarCirculo.executar(
    dados.codigoConvite,
    usuario.id,
  );

  return MembroCirculoResponseDto.fromDomain(membro);
}










/**
 * Lista os participantes de um círculo.
 *
 * Apenas usuários que pertencem ao círculo
 * podem consultar seus participantes.
 */
@Get(':id/membros')
async listarMembros(
  @UsuarioAtual() usuario: UsuarioAutenticado,
  @Param('id', PositiveBigIntPipe) circuloId: string,
): Promise<MembroCirculoResponseDto[]> {
  const membros = await this.listarMembrosCirculo.executar(
    circuloId,
    usuario.id,
  );

  return membros.map((membro) =>
    MembroCirculoResponseDto.fromDomain(membro),
  );
}











}
