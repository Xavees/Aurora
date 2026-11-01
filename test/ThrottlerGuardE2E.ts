import { ThrottlerGuard } from '@nestjs/throttler';
// Desativa o rate limiting somente nos testes E2E
// que não estão verificando limites de requisições.
export class ThrottlerGuardE2E extends ThrottlerGuard {
  override async canActivate(): Promise<boolean> {
    return true;
  }
}
// isso permite que burlemos o limite de requisições globalmente, sem precisar alterar o código da aplicação.


