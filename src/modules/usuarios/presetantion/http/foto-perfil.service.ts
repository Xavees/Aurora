import { BadRequestException, Injectable } from '@nestjs/common';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { AtualizarUsuarioUseCase } from '../../application/use-cases/atualizar-usuario.use-case.js';

export const pastaFotos = () => resolve(process.env.UPLOAD_DIR ?? 'uploads', 'perfis');

@Injectable()
export class FotoPerfilService {
  constructor(private readonly atualizarUsuario: AtualizarUsuarioUseCase) {}

  async salvar(usuarioId: string, arquivo?: { buffer: Buffer }) {
    if (!arquivo?.buffer?.length) throw new BadRequestException('Selecione uma foto.');
    if (arquivo.buffer.length > 5 * 1024 * 1024) throw new BadRequestException('A foto deve ter até 5 MB.');
    let imagem: Buffer;
    try {
      const entrada = sharp(arquivo.buffer, { limitInputPixels: 25_000_000, animated: false });
      const metadata = await entrada.metadata();
      if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) > 1) {
        throw new Error('Formato inválido');
      }
      imagem = await entrada.rotate().resize(512, 512, { fit: 'cover', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    } catch {
      throw new BadRequestException('Envie uma imagem JPG, PNG ou WebP válida, de até 25 megapixels.');
    }
    const nome = randomUUID() + '.webp';
    const caminho = resolve(pastaFotos(), nome);
    await mkdir(pastaFotos(), { recursive: true });
    await writeFile(caminho, imagem, { flag: 'wx' });
    try {
      return await this.atualizarUsuario.executar(usuarioId, { fotoUrl: '/uploads/perfis/' + nome });
    } catch (erro) {
      await unlink(caminho).catch(() => undefined);
      throw erro;
    }
  }
}
