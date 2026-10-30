FROM node:22-bookworm

# Dependências de sistema necessárias para o argon2 (compilação nativa)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        python3 \
        default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

# Instala o NestJS CLI globalmente
RUN npm install -g @nestjs/cli

# Cria um usuário não-root para segurança
ARG USERNAME=node
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Garante que o usuário 'node' já existe (imagem base) e configura permissões
RUN mkdir -p /home/$USERNAME/.npm-global \
    && chown -R $USER_UID:$USER_GID /home/$USERNAME

ENV NPM_CONFIG_PREFIX=/home/$USERNAME/.npm-global
ENV PATH=$NPM_CONFIG_PREFIX/bin:$PATH

USER $USERNAME
