import { mkdtemp, readdir, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FotoPerfilService } from './foto-perfil.service.js';
import type { AtualizarUsuarioUseCase } from '../../application/use-cases/atualizar-usuario.use-case.js';

describe('Upload de foto de perfil', () => {
  let pasta: string;
  const atualizar = { executar: vi.fn() };
  const service = new FotoPerfilService(atualizar as unknown as AtualizarUsuarioUseCase);
  beforeEach(async () => {
    pasta = await mkdtemp(join(tmpdir(), 'aurora-foto-'));
    vi.stubEnv('UPLOAD_DIR', pasta);
    atualizar.executar.mockReset();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(pasta, { recursive: true, force: true });
  });
  it('converte imagem e usa o usuario autenticado', async () => {
    const buffer = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#123456' } }).png().toBuffer();
    atualizar.executar.mockImplementation(async (id, dados) => ({ id, ...dados }));
    const resultado = await service.salvar('42', { buffer });
    expect(resultado.id).toBe('42');
    expect(resultado.fotoUrl).toMatch(/^\/uploads\/perfis\/[0-9a-f-]+\.webp$/);
    const arquivos = await readdir(join(pasta, 'perfis'));
    const meta = await sharp(await readFile(join(pasta, 'perfis', arquivos[0]!))).metadata();
    expect(meta.format).toBe('webp');
  });
  it('rejeita ausencia, conteudo falso e tamanho excessivo', async () => {
    await expect(service.salvar('42')).rejects.toThrow('Selecione');
    await expect(service.salvar('42', { buffer: Buffer.from('<svg></svg>') })).rejects.toThrow('válida');
    await expect(service.salvar('42', { buffer: Buffer.alloc(5 * 1024 * 1024 + 1) })).rejects.toThrow('5 MB');
    expect(atualizar.executar).not.toHaveBeenCalled();
  });
  it('remove arquivo novo se o banco rejeitar a atualizacao', async () => {
    const buffer = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } }).png().toBuffer();
    atualizar.executar.mockRejectedValue(new Error('Banco indisponivel'));
    await expect(service.salvar('42', { buffer })).rejects.toThrow('Banco');
    expect(await readdir(join(pasta, 'perfis'))).toEqual([]);
  });
});
