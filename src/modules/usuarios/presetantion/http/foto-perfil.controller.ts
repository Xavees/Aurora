import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../auth/infrastructure/security/guards/jwt-auth.guard.js';
import { UsuarioAtual } from '../../../auth/presentation/http/decorators/usuario-atual.decorator.js';
import type { UsuarioAutenticado } from '../../../auth/domain/entitites/usuario-autenticado.entity.js';
import { UsuarioResponseDto } from './dto/usuario-response.dto.js';
import { FotoPerfilService } from './foto-perfil.service.js';

@Controller('usuarios')
@UseGuards(JwtAuthGuard)
export class FotoPerfilController {
  constructor(private readonly fotos: FotoPerfilService) {}

  @Post('eu/foto')
  @UseInterceptors(FileInterceptor('foto', {
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 },
  }))
  async enviar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @UploadedFile() arquivo?: { buffer: Buffer },
  ): Promise<UsuarioResponseDto> {
    return UsuarioResponseDto.fromDomain(await this.fotos.salvar(usuario.id, arquivo));
  }
}
