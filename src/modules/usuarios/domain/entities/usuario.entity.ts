export interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  fotoUrl: string | null;
  tipoUsuario: 'COMUM' | 'PREMIUM';
}