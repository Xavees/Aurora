
import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/infrastructure/security/guards/jwt-auth.guard.js';
import { UsuarioAtual } from '../../auth/presentation/http/decorators/usuario-atual.decorator.js';

import type { UsuarioAutenticado } from '../../auth/domain/entitites/usuario-autenticado.entity.js';

import { ListarHistoricoLocalizacaoUseCase } from '../application/use-cases/listar-historico-localizacao.use-case.js';
import { BuscarHistoricoLocalizacaoPorIdUseCase } from '../application/use-cases/buscar-historico-localizacao-por-id.use-case.js';

import { ConsultarHistoricoLocalizacaoDto } from './dto/consultar-historico-localizacao.dto.js';
import { HistoricoLocalizacaoParamsDto } from './dto/historico-localizacao-params.dto.js';
import { HistoricoLocalizacaoResponseDto } from './dto/historico-localizacao-response.dto.js';
import { HistoricoLocalizacaoPaginadoResponseDto } from './dto/historico-localizacao-paginado-response.dto.js';

@Controller('historico-localizacao')
@UseGuards(JwtAuthGuard)
export class HistoricoLocalizacaoController {
  constructor(
    private readonly listarHistorico: ListarHistoricoLocalizacaoUseCase,
    private readonly buscarHistorico: BuscarHistoricoLocalizacaoPorIdUseCase,
  ) {}

  /**
   * Lista o histórico do usuário autenticado,
   * aplicando filtros de período e paginação.
   */
  @Get('me')
  async listar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query() filtros: ConsultarHistoricoLocalizacaoDto,
  ): Promise<HistoricoLocalizacaoPaginadoResponseDto> {
    const dataInicio = filtros.dataInicio
      ? new Date(filtros.dataInicio)
      : undefined;

    const dataFim = filtros.dataFim
      ? new Date(filtros.dataFim)
      : undefined;

    // Impede consultas com períodos invertidos.
    if (dataInicio && dataFim && dataInicio > dataFim) {
      throw new BadRequestException(
        'A data inicial não pode ser posterior à data final.',
      );
    }

    const resultado = await this.listarHistorico.executar({
      usuarioId: usuario.id,
      dataInicio,
      dataFim,
      pagina: filtros.pagina,
      limite: filtros.limite,
    });

    return HistoricoLocalizacaoPaginadoResponseDto.fromDomain(
      resultado,
    );
  }

  /**
   * Consulta um registro específico pertencente
   * ao usuário autenticado.
   */
  @Get('me/:id')
  async buscarPorId(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param() params: HistoricoLocalizacaoParamsDto,
  ): Promise<HistoricoLocalizacaoResponseDto> {
    // Limite máximo suportado por BIGINT UNSIGNED.
    if (BigInt(params.id) > 18446744073709551615n) {
      throw new BadRequestException(
        'Identificador de localização inválido.',
      );
    }

    const localizacao = await this.buscarHistorico.executar(
      params.id,
      usuario.id,
    );

    return HistoricoLocalizacaoResponseDto.fromDomain(
      localizacao,
    );
  }
}
