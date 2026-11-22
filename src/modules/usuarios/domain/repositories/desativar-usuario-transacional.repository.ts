
export interface DesativarUsuarioTransacionalRepository {
  /**
   * @returns true se a conta ativa foi desativada.
   * @returns false se não existir uma conta ativa com esse ID.
   */
  desativar(id: string): Promise<boolean>;
}
