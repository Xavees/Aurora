import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {  RemoverMembroTransacionalRepository,ResultadoRemocaoMembro,} from '../../../../domain/repositories/remover-membro-transacional.repository.js';
import { CirculoOrmEntity } from '../entities/circulo.orm-entity.js';
import { MembroCirculoOrmEntity } from '../entities/membro-circulo.orm-entity.js';
import { BloqueioCirculoOrmEntity } from '../entities/bloqueio-circulo.orm-entity.js';

@Injectable()
export class TypeOrmRemoverMembroTransacionalRepository implements RemoverMembroTransacionalRepository{ 
    constructor(private readonly dataSource: DataSource) {}

  async remover(
    circuloId: string,
    solicitanteId: string,
    membroId: string,
  ): Promise<ResultadoRemocaoMembro> {
    return this.dataSource.transaction(async (manager) => {
      /*
       * Bloqueamos o círculo antes de consultar seus membros.
       * Isso serializa as operações que seguem o mesmo
       * protocolo de bloqueio.
       */
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

      // O solicitante precisa participar como administrador.
      const solicitante = await membroRepository.findOne({
        where: {
          circuloId,
          usuarioId: solicitanteId,
        },
      });

      if (!solicitante || solicitante.funcao !== 'ADMINISTRADOR') {
        return 'SOLICITANTE_NAO_E_ADMINISTRADOR';
      }

      // A saída voluntária possui regras próprias.
      if (solicitanteId === membroId) {
        return 'AUTO_REMOCAO_NAO_PERMITIDA';
      }

      // membroId representa o ID do usuário que será removido.
      const membroAlvo = await membroRepository.findOne({
        where: {
          circuloId,
          usuarioId: membroId,
        },
      });

      if (!membroAlvo) {
        return 'MEMBRO_NAO_ENCONTRADO';
      }

    

if (membroAlvo.funcao === 'ADMINISTRADOR') {
  return 'REMOCAO_ADMINISTRADOR_NAO_PERMITIDA';
}

/**
 * Registra o bloqueio administrativo antes da remoção.
 *
 * Ambas as operações utilizam o manager da mesma
 * transação para garantir atomicidade.
 */
const bloqueioRepository = manager.getRepository(
  BloqueioCirculoOrmEntity,
);

const bloqueio = bloqueioRepository.create({
  circuloId,
  usuarioId: membroId,
  bloqueadoPorId: solicitanteId,
});

await bloqueioRepository.save(bloqueio);

// Remove a participação do usuário.
await membroRepository.remove(membroAlvo);

return 'MEMBRO_REMOVIDO';




    });
  }
}
