
import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Body,
  Post,
  Patch,
  BadRequestException,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/infrastructure/security/guards/jwt-auth.guard.js';

import { ListarAreasRiscoUseCase } from '../application/use-cases/listar-areas-risco.use-case.js';

import { BuscarAreaRiscoPorIdUseCase } from '../application/use-cases/buscar-area-risco-por-id.use-case.js';

import { ConsultarAreasRiscoDto } from './dto/consultar-areas-risco.dto.js';

import {
  AreaRiscoParamsDto,
  validarAreaRiscoId,
} from './dto/area-risco-params.dto.js';

import { AtualizarAreaRiscoUseCase } from '../application/use-cases/atualizar-area-risco.use-case.js';
import { AtualizarAreaRiscoDto } from './dto/atualizar-area-risco.dto.js';

import { AreasRiscoPaginadoResponseDto } from './dto/areas-risco-paginado-response.dto.js';
import { CriarAreaRiscoUseCase } from '../application/use-cases/criar-area-risco.use-case.js';


import { CriarAreaRiscoDto } from './dto/criar-area-risco.dto.js';

import { UsuarioAtual } from '../../auth/presentation/http/decorators/usuario-atual.decorator.js';

import type { UsuarioAutenticado } from '../../auth/domain/entitites/usuario-autenticado.entity.js';
import { AreaRiscoResponseDto } from './dto/area-risco-response.dto.js';
import { ExcluirAreaRiscoUseCase } from '../application/use-cases/excluir-area-risco.use-case.js';

@ApiTags('Áreas de Risco')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Token JWT ausente ou inválido.',
})
@Controller('areas-risco')
@UseGuards(JwtAuthGuard)

export class AreasRiscoController {
  constructor(
    private readonly listarAreasRiscoUseCase: ListarAreasRiscoUseCase,
    private readonly buscarAreaRiscoPorIdUseCase: BuscarAreaRiscoPorIdUseCase,
    private readonly criarAreaRiscoUseCase: CriarAreaRiscoUseCase,
    private readonly atualizarAreaRiscoUseCase: AtualizarAreaRiscoUseCase,
    private readonly excluirAreaRiscoUseCase: ExcluirAreaRiscoUseCase,
  ) {}



/**
 * Cadastra uma área de risco colaborativa.
 *
 * O JwtAuthGuard, aplicado no controller,
 * garante que a requisição seja autenticada.
 *
 * O autor é obtido do JWT e nunca do body.
 */











@ApiOperation({
  summary: 'Cadastrar uma área de risco colaborativa',
  description:
    'Cadastra uma nova área vinculada ao usuário autenticado. ' +
    'A origem será COLABORATIVA e o status inicial será PENDENTE. ' +
    'A área não aparecerá nas consultas comuns até ser verificada.',
})
@ApiCreatedResponse({
  description: 'Área cadastrada e aguardando verificação.',
  type: AreaRiscoResponseDto,
})
@ApiBadRequestResponse({
  description: 'Dados inválidos ou propriedades não permitidas.',
})

@Post()
async criar(
  @UsuarioAtual() usuario: UsuarioAutenticado,
  @Body() dados: CriarAreaRiscoDto,
): Promise<AreaRiscoResponseDto> {
  const area = await this.criarAreaRiscoUseCase.executar({
    nome: dados.nome,
    descricao: dados.descricao,
    nivelRisco: dados.nivelRisco,

    latitude: dados.latitude,
    longitude: dados.longitude,
    raioMetros: dados.raioMetros,

    // O usuário autenticado será o autor da área.
    usuarioId: usuario.id,
  });

  // O NestJS retorna HTTP 201 automaticamente
  // quando uma requisição POST é bem-sucedida.
  return AreaRiscoResponseDto.fromDomain(area);
}








/**
 * Atualiza parcialmente uma área de risco colaborativa.
 *
 * O identificador do autor é obtido exclusivamente
 * do JWT, nunca do corpo da requisição.
 */
@ApiOperation({
  summary: 'Atualizar uma área de risco colaborativa',
  description:
    'Permite ao autor atualizar os campos de uma área colaborativa. ' +
    'Após a alteração, a área retorna ao status PENDENTE ' +
    'e precisa passar novamente pela moderação.',
})
@ApiParam({
  name: 'id',
  description: 'Identificador BIGINT da área de risco.',
  type: String,
  example: '9007199254740993',
  required: true,
})
@ApiOkResponse({
  description: 'Área de risco atualizada com sucesso.',
  type: AreaRiscoResponseDto,
})
@ApiBadRequestResponse({
  description:
    'ID inválido, dados inválidos, propriedades proibidas ou corpo vazio.',
})
@ApiUnauthorizedResponse({
  description: 'Token JWT ausente ou inválido.',
})
@ApiForbiddenResponse({
  description:
    'Usuário sem permissão ou área que não permite edição colaborativa.',
})
@ApiNotFoundResponse({
  description: 'Área inexistente ou excluída logicamente.',
})
@Patch(':id')
async atualizar(
  @Param() parametros: AreaRiscoParamsDto,
  @UsuarioAtual() usuario: UsuarioAutenticado,
  @Body() dados: AtualizarAreaRiscoDto,
): Promise<AreaRiscoResponseDto> {
  // Preserva nossa validação de identificadores BIGINT.
  validarAreaRiscoId(parametros.id);

 
  /**
   * Passamos somente os campos permitidos.
   *
   * undefined significa que o campo não foi enviado.
   * null significa remover um valor opcional.
   */
  const atualizacoes = {
    ...(dados.nome !== undefined && {
      nome: dados.nome,
    }),
    ...(dados.descricao !== undefined && {
      descricao: dados.descricao,
    }),
    ...(dados.nivelRisco !== undefined && {
      nivelRisco: dados.nivelRisco,
    }),
    ...(dados.latitude !== undefined && {
      latitude: dados.latitude,
    }),
    ...(dados.longitude !== undefined && {
      longitude: dados.longitude,
    }),
    ...(dados.raioMetros !== undefined && {
      raioMetros: dados.raioMetros,
    }),
  };



/**
 * Verifica os campos efetivamente informados.
 *
 * As propriedades undefined já foram removidas
 * durante a construção do objeto atualizacoes.
 *
 * Valores null continuam válidos para limpar
 * campos opcionais.
 */
if (Object.keys(atualizacoes).length === 0) {
  throw new BadRequestException(
    'Informe pelo menos um campo para atualização.',
  );
}

  const area = await this.atualizarAreaRiscoUseCase.executar({
    id: parametros.id,
    usuarioId: usuario.id,
    dados: atualizacoes,
  });

  return AreaRiscoResponseDto.fromDomain(area);
}






/**
 * Realiza a exclusão lógica de uma área colaborativa.
 *
 * O registro permanece no MariaDB, recebendo apenas
 * a data de exclusão no campo excluidoEm.
 *
 * A identificação do autor vem do JWT autenticado.
 */
@ApiOperation({
  summary: 'Excluir logicamente uma área de risco',
  description:
    'Permite ao autor excluir sua própria área colaborativa. ' +
    'O registro permanece armazenado no banco de dados, ' +
    'mas deixa de aparecer nas consultas públicas.',
})
@ApiParam({
  name: 'id',
  description: 'Identificador BIGINT da área de risco.',
  type: String,
  example: '9007199254740993',
  required: true,
})
@ApiNoContentResponse({
  description: 'Área de risco excluída logicamente com sucesso.',
})
@ApiBadRequestResponse({
  description: 'Identificador inválido ou fora do intervalo permitido.',
})
@ApiForbiddenResponse({
  description:
    'Usuário sem permissão ou área que não permite exclusão colaborativa.',
})
@ApiNotFoundResponse({
  description: 'Área inexistente ou já excluída logicamente.',
})
@Delete(':id')
@HttpCode(HttpStatus.NO_CONTENT)
async excluir(
  @Param() parametros: AreaRiscoParamsDto,
  @UsuarioAtual() usuario: UsuarioAutenticado,
): Promise<void> {
  // Mantém a validação de identificadores BIGINT.
  validarAreaRiscoId(parametros.id);

  /**
   * O caso de uso verifica existência, autoria e origem.
   * O repositório repete as verificações dentro de uma
   * transação com bloqueio pessimista.
   */
  await this.excluirAreaRiscoUseCase.executar({
    id: parametros.id,
    usuarioId: usuario.id,
  });

  // HTTP 204 não deve retornar corpo de resposta.
}








































  /**
   * Lista as áreas de risco disponíveis.
   *
   * O DTO valida filtros e paginação antes
   * de executar o caso de uso.
   */







@ApiOperation({
  summary: 'Listar áreas de risco verificadas',
  description:
    'Retorna somente áreas verificadas e não excluídas, ' +
    'com filtro opcional por nível de risco e paginação.',
})
@ApiOkResponse({
  description: 'Listagem paginada de áreas de risco.',
  type: AreasRiscoPaginadoResponseDto,
})
@ApiBadRequestResponse({
  description: 'Filtros ou parâmetros de paginação inválidos.',
})

  @Get()
  async listar(
    @Query() filtros: ConsultarAreasRiscoDto,
  ): Promise<AreasRiscoPaginadoResponseDto> {
    const resultado = await this.listarAreasRiscoUseCase.executar({
      nivelRisco: filtros.nivelRisco,
      pagina: filtros.pagina,
      limite: filtros.limite,
    });

    return AreasRiscoPaginadoResponseDto.fromDomain(resultado);
  }



























@ApiOperation({
  summary: 'Consultar uma área de risco por ID',
  description:
    'Consulta uma área verificada e ativa pelo identificador BIGINT.',
})
@ApiOkResponse({
  description: 'Área de risco encontrada.',
  type: AreaRiscoResponseDto,
})
@ApiBadRequestResponse({
  description: 'Identificador inválido ou fora do intervalo permitido.',
})
@ApiNotFoundResponse({
  description:
    'Área inexistente, não verificada ou excluída logicamente.',
})

@ApiParam({
  name: 'id',
  description: 'Identificador BIGINT da área de risco.',
  type: String,
  example: '9007199254740993',
  required: true,
})
  /**
   * Consulta uma área de risco pelo ID.
   *
   * Primeiro verificamos o formato e o intervalo
   * do BIGINT para evitar consultas inválidas.
   */


  @Get(':id')
  async buscarPorId(
    @Param() parametros: AreaRiscoParamsDto,
  ): Promise<AreaRiscoResponseDto> {
    validarAreaRiscoId(parametros.id);

    const area = await this.buscarAreaRiscoPorIdUseCase.executar(
      parametros.id,
    );

    return AreaRiscoResponseDto.fromDomain(area);
  }
}
