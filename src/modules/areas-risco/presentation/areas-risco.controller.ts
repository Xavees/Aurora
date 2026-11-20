
import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/infrastructure/security/guards/jwt-auth.guard.js';

import { ListarAreasRiscoUseCase } from '../application/use-cases/listar-areas-risco.use-case.js';

import { BuscarAreaRiscoPorIdUseCase } from '../application/use-cases/buscar-area-risco-por-id.use-case.js';

import { ConsultarAreasRiscoDto } from './dto/consultar-areas-risco.dto.js';

import {
  AreaRiscoParamsDto,
  validarAreaRiscoId,
} from './dto/area-risco-params.dto.js';

import { AreaRiscoResponseDto } from './dto/area-risco-response.dto.js';

import { AreasRiscoPaginadoResponseDto } from './dto/areas-risco-paginado-response.dto.js';

@Controller('areas-risco')
@UseGuards(JwtAuthGuard)
export class AreasRiscoController {
  constructor(
    private readonly listarAreasRiscoUseCase: ListarAreasRiscoUseCase,
    private readonly buscarAreaRiscoPorIdUseCase: BuscarAreaRiscoPorIdUseCase,
  ) {}

  /**
   * Lista as áreas de risco disponíveis.
   *
   * O DTO valida filtros e paginação antes
   * de executar o caso de uso.
   */
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
