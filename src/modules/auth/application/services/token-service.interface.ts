export interface TokenPayload {
  sub: string;
  email: string;
}

export interface TokenService {
  gerarAccessToken(payload: TokenPayload): Promise<string>;
}