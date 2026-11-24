
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type {
  DesbloquearMembroTransacionalRepository,
  ResultadoDesbloqueioMembro,
} from '../../../../domain/repositories/desbloquear-membro-transacional.repository.js';

import { CirculoOrmEntity } from '../entities/circulo.orm-entity.js';
import { MembroCirculoOrmEntity } from '../entities/membro-circulo.orm-entity.js';
import { BloqueioCirculoOrmEntity } from '../entities/bloqueio-circulo.orm-entity.js';
import { UsuarioOrmEntity } from '../../../../../usuarios/infrastructure/persistence/typeorm/entities/usuario.orm-entity.js';

@Injectable()
export class TypeOrmDesbloquearMembroTransacionalRepository
  implements DesbloquearMembroTransacionalRepository
{
  constructor(private readonly dataSource: DataSource) {}

  async desbloquear(
    circuloId: string,
    solicitanteId: string,
    usuarioAlvoId: string | { email: string },
  ): Promise<ResultadoDesbloqueioMembro> {
    return this.dataSource.transaction(async (manager) => {
      // Bloqueia a conta do solicitante e confirma que está ativa.
      const usuario = await manager
        .getRepository(UsuarioOrmEntity)
        .createQueryBuilder('usuario')
        .setLock('pessimistic_write')
        .where('usuario.id = :solicitanteId', { solicitanteId })
        .andWhere('usuario.excluidoEm IS NULL')
        .getOne();

      if (!usuario) {
        return 'SOLICITANTE_NAO_E_ADMINISTRADOR';
      }

      // Bloqueia o círculo antes de verificar as permissões.
      const circulo = await manager
        .getRepository(CirculoOrmEntity)
        .createQueryBuilder('circulo')
        .setLock('pessimistic_write')
        .where('circulo.id = :circuloId', { circuloId })
        .getOne();

      if (!circulo) {
        return 'CIRCULO_NAO_ENCONTRADO';
      }

      const membroRepository = manager.getRepository(
        MembroCirculoOrmEntity,
      );

      const solicitante = await membroRepository.findOne({
        where: {
          circuloId,
          usuarioId: solicitanteId,
        },
      });

      if (!solicitante || solicitante.funcao !== 'ADMINISTRADOR') {
        return 'SOLICITANTE_NAO_E_ADMINISTRADOR';
      }

      // Resolve o e-mail somente depois de autorizar o administrador.
      if (typeof usuarioAlvoId !== 'string') {
        const alvo = await manager.getRepository(UsuarioOrmEntity).findOne({
          where: { email: usuarioAlvoId.email.trim().toLowerCase() },
          select: { id: true },
        });
        if (!alvo) return 'BLOQUEIO_NAO_ENCONTRADO';
        usuarioAlvoId = alvo.id;
      }

      const bloqueioRepository = manager.getRepository(
        BloqueioCirculoOrmEntity,
      );

      const bloqueio = await bloqueioRepository.findOne({
        where: {
          circuloId,
          usuarioId: usuarioAlvoId,
        },
      });

      if (!bloqueio) {
        return 'BLOQUEIO_NAO_ENCONTRADO';
      }

      // Remove o bloqueio administrativo na mesma transação.
      await bloqueioRepository.remove(bloqueio);

      return 'MEMBRO_DESBLOQUEADO';
    });
  }
}
