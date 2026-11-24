import { describe, it, expect, vi } from 'vitest';
import type { DataSource } from 'typeorm';
import { TypeOrmDesbloquearMembroTransacionalRepository } from './typeorm-desbloquear-membro-transacional.repository.js';

function preparar(admin = true, existe = true) {
  const consulta = { setLock: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), andWhere: vi.fn().mockReturnThis(), getOne: vi.fn().mockResolvedValue({ id: '1' }) };
  const alvo = vi.fn().mockResolvedValue(existe ? { id: '42' } : null);
  const bloqueio = { findOne: vi.fn().mockResolvedValue({ id: '9' }), remove: vi.fn() };
  const usuario = { createQueryBuilder: () => consulta, findOne: alvo };
  const manager = { getRepository: vi.fn()
    .mockReturnValueOnce(usuario)
    .mockReturnValueOnce({ createQueryBuilder: () => consulta })
    .mockReturnValueOnce({ findOne: vi.fn().mockResolvedValue({ funcao: admin ? 'ADMINISTRADOR' : 'MEMBRO' }) })
    .mockReturnValueOnce(usuario)
    .mockReturnValueOnce(bloqueio) };
  const dataSource = { transaction: (callback: (m: typeof manager) => unknown) => callback(manager) } as unknown as DataSource;
  return { repository: new TypeOrmDesbloquearMembroTransacionalRepository(dataSource), alvo, bloqueio };
}
describe('desbloqueio por e-mail', () => {
  it('resolve e-mail para ID e remove apenas o bloqueio do círculo', async () => {
    const { repository, alvo, bloqueio } = preparar();
    expect(await repository.desbloquear('7', '1', { email: ' TESTE@EXEMPLO.COM ' })).toBe('MEMBRO_DESBLOQUEADO');
    expect(alvo).toHaveBeenCalledWith({ where: { email: 'teste@exemplo.com' }, select: { id: true } });
    expect(bloqueio.findOne).toHaveBeenCalledWith({ where: { circuloId: '7', usuarioId: '42' } });
    expect(bloqueio.remove).toHaveBeenCalledWith({ id: '9' });
  });
  it('nega acesso antes de consultar o e-mail', async () => {
    const { repository, alvo, bloqueio } = preparar(false);
    expect(await repository.desbloquear('7', '1', { email: 'teste@exemplo.com' })).toBe('SOLICITANTE_NAO_E_ADMINISTRADOR');
    expect(alvo).not.toHaveBeenCalled();
    expect(bloqueio.remove).not.toHaveBeenCalled();
  });
  it('não revela se um e-mail sem bloqueio está cadastrado', async () => {
    const { repository, bloqueio } = preparar(true, false);
    expect(await repository.desbloquear('7', '1', { email: 'teste@exemplo.com' })).toBe('BLOQUEIO_NAO_ENCONTRADO');
    expect(bloqueio.remove).not.toHaveBeenCalled();
  });
});
